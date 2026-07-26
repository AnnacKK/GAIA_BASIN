import { createClient } from "@libsql/client";

const databaseUrl = (typeof import.meta !== 'undefined' && import.meta.env) 
  ? import.meta.env.TURSO_DATABASE_URL 
  : process.env.TURSO_DATABASE_URL;

const authToken = (typeof import.meta !== 'undefined' && import.meta.env) 
  ? import.meta.env.TURSO_AUTH_TOKEN 
  : process.env.TURSO_AUTH_TOKEN;

const client = createClient({
  url: databaseUrl,
  authToken: authToken,
});

export const GET = async () => {
  let contributors = {};
  try {
     // Fetch the contributors configuration to check for incognito settings
     const contribRes = await fetch('https://raw.githubusercontent.com/AnnacKK/GAIA_BASIN_NOTES/main/contributors.json?t=' + Date.now());
     if (contribRes.ok) {
        contributors = await contribRes.json();
     }
  } catch (e) {
     console.error("Failed to load contributors configuration:", e);
  }

  try {
     const dbResult = await client.execute(`
        SELECT r.*, GROUP_CONCAT(t.name) as tags
        FROM researches r
        LEFT JOIN research_tags rt ON r.id = rt.research_id
        LEFT JOIN tags t ON rt.tag_id = t.id
        GROUP BY r.id
        ORDER BY r.id DESC
     `);
     
     const researches = dbResult.rows.map(row => {
        const authorName = row.author || 'Anonymous Contributor';
        const isIncognito = contributors[authorName]?.incognito;
        
        return {
           id: row.id,
           url: row.url,
           title: row.title,
           description: row.description,
           image: row.image,
           category: row.category,
           author: isIncognito ? 'Anonymous Contributor' : authorName,
           tags: row.tags ? row.tags.split(',') : [],
           created_at: row.created_at
        };
     });

     return new Response(JSON.stringify(researches), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
     });

  } catch (error) {
     console.error("Database query failed:", error);
     return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
     });
  }
};
