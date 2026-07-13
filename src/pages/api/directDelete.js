import { parseCookies, verifyPayload } from '../../lib/auth.js';
import { getGitHubUser, REPO_USER, REPO_NAME, getFileInfo, upsertFileContent } from '../../lib/github.js';

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
  const type = String(payload.type || 'resource').trim().toLowerCase();

  if (!path || !title) {
    return new Response(JSON.stringify({ error: 'Missing path or title' }), { status: 400 });
  }

  const deleteSingleFile = async (filePath, sha, commitMsg) => {
    const res = await fetch(`https://api.github.com/repos/${REPO_USER}/${REPO_NAME}/contents/${encodeURIComponent(filePath).replace(/%2F/g, '/')}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${MASTER_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: commitMsg,
        sha: sha
      })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Failed to delete ${filePath}: ${text}`);
    }
  };

  const deleteDirectory = async (dirPath, username) => {
    const res = await fetch(`https://api.github.com/repos/${REPO_USER}/${REPO_NAME}/contents/${encodeURIComponent(dirPath).replace(/%2F/g, '/')}`, {
      headers: {
        'Authorization': `token ${MASTER_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });
    if (!res.ok) return;
    const items = await res.json();
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.type === 'dir') {
          await deleteDirectory(item.path, username);
        } else if (item.type === 'file' && item.name.toLowerCase().endsWith('.md')) {
          const fileRes = await fetch(item.download_url, {
            headers: {
              'Authorization': `token ${MASTER_TOKEN}`
            }
          });
          if (fileRes.ok) {
            const fileContent = await fileRes.text();
            let fileAuthor = null;
            const fmMatch = fileContent.match(/^---([\s\S]*?)---/);
            if (fmMatch) {
              const fmLines = fmMatch[1].split('\n');
              for (const fml of fmLines) {
                const trimmedFml = fml.trim();
                if (trimmedFml.startsWith('author:')) {
                  fileAuthor = trimmedFml.replace('author:', '').replace(/["']/g, '').trim();
                  break;
                }
              }
            }
            if (fileAuthor === username) {
              await deleteSingleFile(item.path, item.sha, `Delete branch file: ${item.path} by ${username}`);
            }
          }
        }
      }
    }
  };

  try {
    const user = await getGitHubUser(session.access_token);
    const username = user.login;

    if (type === 'note') {
      const info = await getFileInfo(MASTER_TOKEN, REPO_USER, path);
      if (!info || !info.content) throw new Error("File not found");
      const currentContent = Buffer.from(info.content, 'base64').toString('utf8');

      let fileAuthor = null;
      const fmMatch = currentContent.match(/^---([\s\S]*?)---/);
      if (fmMatch) {
        const fmLines = fmMatch[1].split('\n');
        for (const fml of fmLines) {
          const trimmedFml = fml.trim();
          if (trimmedFml.startsWith('author:')) {
            fileAuthor = trimmedFml.replace('author:', '').replace(/["']/g, '').trim();
            break;
          }
        }
      }

      if (fileAuthor !== username) {
        return new Response(JSON.stringify({ error: 'Unauthorized: You are not the author of this note.' }), { status: 403 });
      }

      await deleteSingleFile(path, info.sha, `Delete note: ${path} by ${username}`);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (type === 'branch') {
      await deleteDirectory(path, username);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    const info = await getFileInfo(MASTER_TOKEN, REPO_USER, path);
    if (!info || !info.content) throw new Error("File not found");
    
    const currentContent = Buffer.from(info.content, 'base64').toString('utf8');

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
