import { REPO_USER, REPO_NAME } from '../../lib/github.js';

const MASTER_TOKEN = import.meta.env.GITHUB_TOKEN;

export const GET = async ({ request }) => {
  const url = new URL(request.url);
  const username = url.searchParams.get('username');
  if (!username) return new Response(JSON.stringify({ error: 'Missing username' }), { status: 400 });

  try {
    const resp = await fetch(`https://api.github.com/repos/${REPO_USER}/${REPO_NAME}/pulls?state=all&creator=${username}&per_page=100`, {
      headers: {
        'Authorization': `token ${MASTER_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache'
      }
    });
    if (!resp.ok) throw new Error('Failed to fetch PRs');
    const prs = await resp.json();
    
    const contributions = prs.filter(pr => {
      const isAuthor = pr.user && pr.user.login.toLowerCase() === username.toLowerCase();
      if (!isAuthor) return false;
      const t = pr.title.toLowerCase();
      return t.startsWith('add ') || t.startsWith('proposed contribution') || t.startsWith('propose');
    }).map(pr => {
      let type = 'resource';
      let title = pr.title;

      const fileIdMatch = pr.body ? pr.body.match(/file: `(.*?)`/) : null;
      let fileId = fileIdMatch ? fileIdMatch[1] : 'Unknown path';

      const titleLower = pr.title.toLowerCase();

      if (pr.title.startsWith('Add Note:') || titleLower.startsWith('propose note')) {
        type = 'note';
        const rawTitle = pr.title.replace(/Add Note:|Propose note:/i, '').trim();
        title = rawTitle.split(' - ')[0];
      } else if (pr.title.startsWith('Add Branch:') || titleLower.includes('branch')) {
        type = 'branch';
        const rawTitle = pr.title.replace(/Add Branch:|Propose new folder branch structure/i, '').trim();
        title = rawTitle ? rawTitle.split(' - ')[0] : 'Proposed branch';
        if (!title || title.trim() === '') {
          title = 'Proposed Branch Structure';
        }
      } else {
        const match = pr.title.match(/Add (.*?) resource: (.*)/i);
        if (match) {
          type = match[1].toLowerCase();
          title = match[2];
        } else if (pr.title.startsWith('Proposed contribution')) {
          title = 'Pending Resource in ' + fileId.split('/').pop().replace('.md', '');
        }
      }
      
      let status = 'WAITING FOR APPROVAL';
      let mergedAt = null;
      if (pr.state === 'closed') {
        if (pr.merged_at) {
          status = 'CONTRIBUTED';
          mergedAt = pr.merged_at;
        } else {
          status = 'NOT APPROVED';
        }
      }
      

      return {
        isPr: true,
        type: type.toLowerCase(),
        title: title,
        url: pr.html_url,
        status: status,
        prNumber: pr.number,
        fileId: fileId,
        author: username,
        incognito: false, // Can't easily parse incognito state from standard PR title right now
        mergedAt: mergedAt
      };
    });
    
    return new Response(JSON.stringify(contributions), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
