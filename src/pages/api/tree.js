import { REPO_USER } from '../../lib/github.js';

const MASTER_TOKEN = import.meta.env.GITHUB_TOKEN;
export const GET = async () => {
  const REPO_NAME_SYNC = 'GAIA_BASIN_NOTES';
  const REPO_BRANCH_SYNC = 'main';

  try {
    const r = await fetch(`https://api.github.com/repos/${REPO_USER}/${REPO_NAME_SYNC}/git/trees/${REPO_BRANCH_SYNC}?recursive=1`, {
      headers: {
        'Authorization': `Bearer ${MASTER_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });

    if (!r.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch tree' }), { 
        status: r.status, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const data = await r.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // s-maxage=30 tells Vercel CDN to cache this response across all users for 30s.
        // stale-while-revalidate=59 tells Vercel to serve stale content while refetching in background.
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=59'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
};
