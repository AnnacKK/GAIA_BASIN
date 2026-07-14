import { parseCookies, verifyPayload } from '../../lib/auth.js';
import { REPO_USER, ensureFork, getFileInfo, upsertFileContent, createPullRequest, createBranch } from '../../lib/github.js';

export const POST = async ({ request }) => {
  const cookies = parseCookies(request.headers.get('cookie'));
  const signed = cookies.gh_session;
  if (!signed) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const session = verifyPayload(signed);
  if (!session || !session.access_token || session.exp < Date.now()) {
    return new Response(JSON.stringify({ error: 'Session expired' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const payload = await request.json();
  const researchItem = payload.research;

  if (!researchItem || !researchItem.url) {
    return new Response(JSON.stringify({ error: 'Missing research item or URL' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const contributor = payload.contributor || 'unknown';
    const forkOwner = contributor === 'AnnacKK' ? 'AnnacKK' : contributor;
    const branchName = `add-research-${Date.now()}`;
    const filePath = 'Useful_Researches.json';

    // 1. Ensure fork & branch
    await ensureFork(session.access_token, forkOwner);
    await createBranch(session.access_token, forkOwner, branchName);

    // 2. Fetch existing Useful_Researches.json from upstream (AnnacKK/GAIA_BASIN_NOTES)
    let currentResearches = [];
    let sha = null;
    try {
       const info = await getFileInfo(session.access_token, REPO_USER, filePath);
       if (info && info.content) {
          const decoded = Buffer.from(info.content, 'base64').toString('utf8');
          currentResearches = JSON.parse(decoded);
       }
    } catch (e) {
       // File might not exist yet, which is fine
       console.log('Useful_Researches.json not found, will create a new one.');
    }

    // 3. Append new research
    currentResearches.push(researchItem);
    const newContent = JSON.stringify(currentResearches, null, 2);

    // 4. Upsert file content to the new branch on the fork
    await upsertFileContent({
      token: session.access_token,
      owner: forkOwner,
      path: filePath,
      branch: branchName,
      content: newContent,
      message: `Add useful research: ${researchItem.title || researchItem.url}`
    });

    // 5. Create Pull Request against AnnacKK/GAIA_BASIN_NOTES
    const pr = await createPullRequest({
      token: session.access_token,
      head: `${forkOwner}:${branchName}`,
      base: 'main',
      title: `Add useful research: ${researchItem.title || researchItem.url}`,
      body: `This PR adds a new useful research link:\n\n**${researchItem.title || 'Link'}**\n${researchItem.url}`
    });
    const prUrl = pr.html_url;

    return new Response(JSON.stringify({ success: true, url: prUrl }), { 
       status: 200, 
       headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Error submitting research:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
       status: 500, 
       headers: { 'Content-Type': 'application/json' } 
    });
  }
};
