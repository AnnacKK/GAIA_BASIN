import { parseCookies, verifyPayload } from '../../lib/auth.js';
import { REPO_USER, REPO_NAME } from '../../lib/github.js';

export const GET = async ({ request }) => {
  const cookies = parseCookies(request.headers.get('cookie'));
  const signed = cookies.gh_session;
  if (!signed) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const session = verifyPayload(signed);
  if (!session || !session.access_token || session.exp < Date.now()) {
    return new Response(JSON.stringify({ error: 'Session expired' }), { status: 401 });
  }

  const url = new URL(request.url);
  const prNumber = url.searchParams.get('number');
  if (!prNumber) return new Response(JSON.stringify({ error: 'Missing PR number' }), { status: 400 });

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO_USER}/${REPO_NAME}/pulls/${prNumber}?t=${Date.now()}`, {
      headers: {
        'Authorization': `token ${session.access_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!res.ok) throw new Error('GitHub API error');
    const data = await res.json();
    
    return new Response(JSON.stringify({
      merged: data.merged === true,
      state: data.state
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
