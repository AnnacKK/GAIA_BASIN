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

  const payload = await request.json();
  const researchItem = payload.research;
  const contributor = payload.contributor || 'anonymous';

  if (!researchItem || !researchItem.url) {
    return new Response(JSON.stringify({ error: 'Missing research item or URL' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
     const category = researchItem.category || 'uncategorized';
     const insertRes = await client.execute({
        sql: "INSERT INTO researches (url, title, description, image, category, author) VALUES (?, ?, ?, ?, ?, ?)",
        args: [researchItem.url, researchItem.title || '', researchItem.description || '', researchItem.image || '', category, contributor]
     });
     const researchId = Number(insertRes.lastInsertRowid);
     
     const tagsToInsert = new Set();
     if (category) {
        tagsToInsert.add(category.toLowerCase().trim());
     }
     
     let tagsArray = [];
     if (Array.isArray(researchItem.tags)) {
        tagsArray = researchItem.tags;
     } else if (typeof researchItem.tags === 'string') {
        tagsArray = researchItem.tags.split(',').map(t => t.trim()).filter(Boolean);
     }
     
     tagsArray.forEach(t => tagsToInsert.add(t.toLowerCase().trim().replace(/\s+/g, '-')));

     // Default smart tags
     if (category.toLowerCase().includes('leetcode')) {
        tagsToInsert.add('leetcode-style');
        tagsToInsert.add('programming');
     } else if (category.toLowerCase().includes('roadmap')) {
        tagsToInsert.add('roadmaps');
        tagsToInsert.add('planning');
     } else if (category.toLowerCase().includes('blog')) {
        tagsToInsert.add('best-blog-selections');
        tagsToInsert.add('articles');
     }

     for (const tagName of tagsToInsert) {
        if (!tagName) continue;
        await client.execute({
           sql: "INSERT OR IGNORE INTO tags (name) VALUES (?)",
           args: [tagName]
        });
        const tagRes = await client.execute({
           sql: "SELECT id FROM tags WHERE name = ?",
           args: [tagName]
        });
        if (tagRes.rows.length > 0) {
           const tagId = tagRes.rows[0].id;
           await client.execute({
              sql: "INSERT OR IGNORE INTO research_tags (research_id, tag_id) VALUES (?, ?)",
              args: [researchId, tagId]
           });
        }
     }

     return new Response(JSON.stringify({ success: true }), { 
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
