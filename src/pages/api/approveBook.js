import { parseCookies, verifyPayload } from '../../lib/auth.js';
import { createClient } from "@libsql/client";

const databaseUrl = (typeof import.meta !== 'undefined' && import.meta.env) 
  ? import.meta.env.TURSO_BOOKS_DATABASE_URL 
  : process.env.TURSO_BOOKS_DATABASE_URL;

const authToken = (typeof import.meta !== 'undefined' && import.meta.env) 
  ? import.meta.env.TURSO_BOOKS_AUTH_TOKEN 
  : process.env.TURSO_BOOKS_AUTH_TOKEN;

const client = createClient({
  url: databaseUrl,
  authToken: authToken,
});

export const POST = async ({ request }) => {
  // 1. Verify Authentication
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
     // Fetch username from GitHub profile
     const userRes = await fetch('https://api.github.com/user', {
        headers: {
           Authorization: `token ${session.access_token}`,
           Accept: 'application/vnd.github.v3+json',
        },
     });
     if (!userRes.ok) {
        return new Response(JSON.stringify({ error: 'Failed to verify identity' }), { status: 500 });
     }
     const userData = await userRes.json();
     const currentUser = userData.login;

     // Ensure user is the Admin (AnnacKK)
     if (currentUser !== 'AnnacKK') {
        return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { status: 403 });
     }

     // 2. Parse payload
     const { id } = await request.json();
     if (!id) {
        return new Response(JSON.stringify({ error: 'Missing book ID' }), { status: 400 });
     }

     // 3. Approve the book
     await client.execute({
        sql: "UPDATE books SET approved = 1 WHERE id = ?",
        args: [id]
     });

     return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
     });

  } catch (error) {
     console.error("Failed to approve book:", error);
     return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
     });
  }
};
