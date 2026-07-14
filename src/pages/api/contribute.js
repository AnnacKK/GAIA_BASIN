import { parseCookies, verifyPayload } from '../../lib/auth.js';
import { REPO_USER, getGitHubUser, ensureFork, getFileInfo, upsertFileContent, createPullRequest, createBranch } from '../../lib/github.js';

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
  const files = payload.files; // Optional array of { path, content }
  const path = String(payload.path || '').trim();
  const content = String(payload.content || '').trim();
  const commitMessage = String(payload.commitMessage || `Proposed contribution`);
  const prDescription = String(payload.prDescription || `Contribution proposed by ${payload.contributor || 'unknown contributor'}.`);

  if ((!files || !files.length) && (!path || !content)) {
    return new Response(JSON.stringify({ error: 'Missing path or content' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const user = await getGitHubUser(session.access_token);
    const contributor = user.login;
    const safeBranch = `contribution-${Date.now()}`;
    const forkOwner = contributor === 'AnnacKK' ? 'AnnacKK' : contributor;

    const fork = await ensureFork(session.access_token, forkOwner);
    const branchName = safeBranch;

    // Create the branch in the target repo (fork or base) before updating/creating content
    await createBranch(session.access_token, forkOwner, branchName);

    if (Array.isArray(files) && files.length > 0) {
      // Multiple files upload
      for (const file of files) {
        const filePath = String(file.path || '').trim();
        const fileContent = String(file.content || '').trim();
        if (!filePath || !fileContent) continue;

        let sha;
        try {
          const info = await getFileInfo(session.access_token, REPO_USER, filePath);
          if (info && info.sha) sha = info.sha;
        } catch (error) {
          if (error.status !== 404) throw error;
        }

        await upsertFileContent({
          token: session.access_token,
          owner: forkOwner,
          path: filePath,
          branch: branchName,
          content: fileContent,
          message: `Add/update file: ${filePath}`,
          sha,
        });
      }
    } else {
      // Single file fallback
      let sha;
      try {
        const info = await getFileInfo(session.access_token, REPO_USER, path);
        if (info && info.sha) sha = info.sha;
      } catch (error) {
        if (error.status !== 404) throw error;
      }

      await upsertFileContent({
        token: session.access_token,
        owner: forkOwner,
        path,
        branch: branchName,
        content,
        message: commitMessage,
        sha,
      });
    }

    const pr = await createPullRequest({
      token: session.access_token,
      title: commitMessage,
      body: `${prDescription}

Proposed by @${contributor}.

file: \`${path || (files && files[0] ? files[0].path : 'multiple files')}\`
folderRoot: \`${files && files[0] ? files[0].path.split('/').slice(0, -1).join('/') : ''}\`

This contribution proposes changes to files inside the vault branch.`,
      head: `${forkOwner}:${branchName}`,
      base: 'main',
    });

    return new Response(JSON.stringify({ prUrl: pr.html_url, prNumber: pr.number }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    const message = error.message || 'Contribution failed';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
