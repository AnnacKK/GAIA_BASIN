import { parseCookies, verifyPayload } from '../../lib/auth.js';
import { createClient } from "@libsql/client";

const client = createClient({
  url: import.meta.env.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL,
  authToken: import.meta.env.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
});

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

  try {
     const payload = await request.json();
     const researchId = payload.id;
     
     if (!researchId) {
        return new Response(JSON.stringify({ error: 'Missing research ID' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
     }

     const userResponse = await fetch('https://api.github.com/user', {
        headers: {
           Authorization: `token ${session.access_token}`,
           Accept: 'application/vnd.github.v3+json',
        },
     });
     
     if (!userResponse.ok) {
        return new Response(JSON.stringify({ error: 'Failed to verify GitHub identity' }), { status: 500 });
     }
     
     const userData = await userResponse.json();
     const username = userData.login;
     
     // 1. Fetch the research to verify ownership
     const selectRes = await client.execute({
        sql: "SELECT author FROM researches WHERE id = ?",
        args: [researchId]
     });
     
     if (selectRes.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Research not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
     }
     
     const author = selectRes.rows[0].author;
     if (author !== username) {
        return new Response(JSON.stringify({ error: 'You are not authorized to delete this research' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
     }
     
     // 2. Perform the deletion (cascade handles the junction table)
     await client.execute({
        sql: "DELETE FROM researches WHERE id = ?",
        args: [researchId]
     });
     
     return new Response(JSON.stringify({ success: true }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
     });

  } catch (error) {
     console.error('Error deleting research:', error);
     return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
     });
  }
};
