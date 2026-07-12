import { parseCookies, verifyPayload } from '../../lib/auth.js';
import { getGitHubUser, REPO_USER, getFileInfo, upsertFileContent } from '../../lib/github.js';

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
  const path = String(payload.path || '').trim();
  const title = String(payload.title || '').trim();

  if (!path || !title) {
    return new Response(JSON.stringify({ error: 'Missing path or title' }), { status: 400 });
  }

  try {
    const user = await getGitHubUser(session.access_token);
    const username = user.login;

    // Fetch the original file content from main
    const info = await getFileInfo(MASTER_TOKEN, REPO_USER, path);
    if (!info || !info.content) throw new Error("File not found");
    
    // Note: getFileInfo returns base64 content
    const currentContent = Buffer.from(info.content, 'base64').toString('utf8');

    // Parse and remove the specific block authored by this user
    const lines = currentContent.split(/\r?\n/);
    const newLines = [];
    let insideTargetResource = false;
    let isAuthorMatch = false;
    let blockLines = [];
    let deleted = false;
    
    const cleanLine = (str) => str.replace(/^[\*\-\s]+/, '').trim();
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (trimmed.startsWith('- type:') || trimmed.startsWith('* type:')) {
          if (blockLines.length > 0) {
              if (insideTargetResource && isAuthorMatch) {
                  deleted = true;
              } else {
                  newLines.push(...blockLines);
              }
          }
          blockLines = [line];
          insideTargetResource = false;
          isAuthorMatch = false;
        } else {
          blockLines.push(line);
          if (trimmed.startsWith('title:')) {
              const blockTitle = cleanLine(trimmed).replace(/^title:\s*['"]?|['"]?$/g, '');
              if (blockTitle === title) insideTargetResource = true;
          }
          if (trimmed.startsWith('author:')) {
              const blockAuthor = cleanLine(trimmed).replace(/^author:\s*['"]?|['"]?$/g, '');
              if (blockAuthor === username) isAuthorMatch = true;
          }
        }
    }
    
    if (blockLines.length > 0) {
        if (insideTargetResource && isAuthorMatch) {
            deleted = true;
        } else {
            newLines.push(...blockLines);
        }
    }

    if (!deleted) {
        return new Response(JSON.stringify({ error: 'Resource not found or unauthorized' }), { status: 403 });
    }

    const finalContent = newLines.join('\n');
    const commitMessage = `Remove resource: ${title} by ${username}`;

    // Push directly to main using master GITHUB_TOKEN
    await upsertFileContent({
      token: MASTER_TOKEN,
      owner: REPO_USER,
      path,
      branch: 'main',
      content: finalContent,
      message: commitMessage,
      sha: info.sha,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
