import { parseCookies, verifyPayload } from '../../lib/auth.js';

const MASTER_TOKEN = import.meta.env.GITHUB_TOKEN;

export const POST = async ({ request }) => {
  const cookies = parseCookies(request.headers.get('cookie'));
  const signed = cookies.gh_session;
  if (!signed) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const session = verifyPayload(signed);
  if (!session || !session.access_token || session.exp < Date.now()) {
    return new Response(JSON.stringify({ error: 'Session expired' }), { status: 401 });
  }

  const payload = await request.json();
  const nodeId = payload.nodeId;
  const title = payload.title || 'Revert Edit';
  const body = payload.body || 'Reverting the merged edit pull request.';

  if (!nodeId) {
    return new Response(JSON.stringify({ error: 'Missing PR nodeId' }), { status: 400 });
  }

  try {
    const graphqlQuery = `
      mutation RevertPR($input: RevertPullRequestInput!) {
        revertPullRequest(input: $input) {
          revertPullRequest {
            id
            number
            url
          }
        }
      }
    `;

    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `bearer ${MASTER_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables: {
          input: {
            pullRequestId: nodeId,
            title: title,
            body: body
          }
        }
      })
    });

    const result = await res.json();

    if (result.errors) {
      throw new Error(result.errors[0].message || 'GraphQL API Error');
    }

    const revertPr = result.data.revertPullRequest.revertPullRequest;

    // GitHub takes a moment to compute mergeability after creating a PR.
    // We will retry the merge a few times with a delay.
    let mergeRes;
    for (let i = 0; i < 3; i++) {
       await new Promise(resolve => setTimeout(resolve, 2000));
       
       mergeRes = await fetch(`https://api.github.com/repos/AnnacKK/GAIA_BASIN_NOTES/pulls/${revertPr.number}/merge`, {
         method: 'PUT',
         headers: {
           'Authorization': `token ${MASTER_TOKEN}`,
           'Content-Type': 'application/json',
           'Accept': 'application/vnd.github.v3+json'
         },
         body: JSON.stringify({
           commit_title: `Auto-merge Revert Edit: ${title}`,
           merge_method: 'merge' // standard merge for revert commits
         })
       });

       if (mergeRes.ok) {
          break; // Success!
       }
    }

    let mergeError = null;
    if (!mergeRes || !mergeRes.ok) {
       const errJson = await mergeRes.json().catch(()=>({}));
       mergeError = errJson.message || `Failed to auto-merge PR #${revertPr.number}`;
       console.warn(`Merge failed:`, mergeError);
    }

    return new Response(JSON.stringify({ success: true, revertPr: revertPr, mergeError }), { status: 200 });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
