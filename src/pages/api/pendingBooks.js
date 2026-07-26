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

export const GET = async ({ request }) => {
  // 1. Verify Authentication
  const cookies = parseCookies(request.headers.get('cookie'));
  const signed = cookies.gh_session;
  if (!signed) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const session = verifyPayload(signed);
  if (!session || !session.access_token || session.exp < Date.now()) {
    return new Response(JSON.stringify({ error: 'Session expired' }), { status: 401 });
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
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
     }

     const dbResult = await client.execute(`
        SELECT b.*, GROUP_CONCAT(t.name) as tags
        FROM books b
        LEFT JOIN book_tags bt ON b.id = bt.book_id
        LEFT JOIN tags t ON bt.tag_id = t.id
        WHERE b.approved = 0
        GROUP BY b.id
        ORDER BY b.id DESC
     `);

     const books = dbResult.rows.map(row => {
        return {
           id: row.id,
           title: row.title,
           description: row.description,
           cover_image: row.cover_image,
           download_url: row.download_url,
           read_url: row.read_url,
           level: row.level,
           theme: row.theme,
           contributor: row.contributor,
           author: row.author || 'Unknown',
           tags: row.tags ? row.tags.split(',') : [],
           created_at: row.created_at
        };
     });

     return new Response(JSON.stringify(books), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
     });

  } catch (error) {
     console.error("Failed to query pending books:", error);
     return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
