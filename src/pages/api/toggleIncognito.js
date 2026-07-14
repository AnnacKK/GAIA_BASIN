import { parseCookies, verifyPayload } from '../../lib/auth.js';
import { REPO_USER, REPO_NAME } from '../../lib/github.js';
import { Buffer } from 'buffer';

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
  const isIncognito = !!payload.incognito;

  try {
    // 1. Fetch current username
    const userRes = await fetch('https://api.github.com/user', { headers: { 'Authorization': `Bearer ${session.access_token}` } });
    const userData = await userRes.json();
    const username = userData.login;
    if (!username) throw new Error("Could not verify GitHub username");

    // 2. Fetch contributors.json
    const fileUrl = `https://api.github.com/repos/${REPO_USER}/${REPO_NAME}/contents/contributors.json`;
    const getRes = await fetch(fileUrl, {
      headers: { 'Authorization': `Bearer ${MASTER_TOKEN}` }
    });

    let contributors = {};
    let sha = null;

    if (getRes.ok) {
      const getData = await getRes.json();
      sha = getData.sha;
      if (getData.content) {
        try {
          const text = Buffer.from(getData.content, 'base64').toString('utf8');
          contributors = JSON.parse(text);
        } catch (e) {
          console.error("Failed to parse contributors.json", e);
        }
      }
    } else if (getRes.status !== 404) {
      throw new Error("Failed to fetch contributors.json from GitHub");
    }

    // 3. Update dictionary
    contributors[username] = { incognito: isIncognito };

    // 4. Push updated file
    const newContent = Buffer.from(JSON.stringify(contributors, null, 2)).toString('base64');
    
    const putBody = {
      message: `Update incognito status for ${username}`,
      content: newContent,
      branch: 'main'
    };
    if (sha) putBody.sha = sha;

    const putRes = await fetch(fileUrl, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${MASTER_TOKEN}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(putBody)
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      throw new Error(`Failed to save contributors.json: ${errText}`);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Failed' }), { status: 500 });
  }
};
