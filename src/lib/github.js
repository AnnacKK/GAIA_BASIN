import { Buffer } from 'buffer';

export const REPO_USER = 'AnnacKK';
export const REPO_NAME = 'GAIA_BASIN_NOTES';
export const REPO_BRANCH = 'main';
const GITHUB_API_BASE = 'https://api.github.com';

const githubRequest = async (token, path, options = {}) => {
  const url = `${GITHUB_API_BASE}${path}`;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `token ${token}`,
    ...options.headers,
  };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`GitHub API ${response.status}: ${text}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
};

export const getGitHubUser = async (token) => githubRequest(token, '/user');

export const getForkedRepo = async (token, owner) => githubRequest(token, `/repos/${owner}/${REPO_NAME}`);

export const createFork = async (token) => githubRequest(token, `/repos/${REPO_USER}/${REPO_NAME}/forks`, {
  method: 'POST',
});

export const ensureFork = async (token, owner) => {
  if (owner === REPO_USER) {
    return { owner: REPO_USER, created: false };
  }

  try {
    await getForkedRepo(token, owner);
    return { owner, created: false };
  } catch (error) {
    if (error.status === 404) {
      await createFork(token);
      const maxAttempts = 8;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
          await getForkedRepo(token, owner);
          return { owner, created: true };
        } catch (innerError) {
          if (attempt === maxAttempts - 1) throw innerError;
        }
      }
    }
    throw error;
  }
};

export const getFileInfo = async (token, owner, path, ref = REPO_BRANCH) => {
  const encodedPath = encodeURIComponent(path).replace(/%2F/g, '/');
  return githubRequest(token, `/repos/${owner}/${REPO_NAME}/contents/${encodedPath}?ref=${ref}`);
};

export const upsertFileContent = async ({ token, owner, path, branch, content, message, sha }) => {
  const encodedPath = encodeURIComponent(path).replace(/%2F/g, '/');
  const payload = {
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch,
  };
  if (sha) payload.sha = sha;
  return githubRequest(token, `/repos/${owner}/${REPO_NAME}/contents/${encodedPath}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });
};

export const createPullRequest = async ({ token, title, body, head, base = REPO_BRANCH }) => {
  return githubRequest(token, `/repos/${REPO_USER}/${REPO_NAME}/pulls`, {
    method: 'POST',
    body: JSON.stringify({ title, body, head, base }),
    headers: { 'Content-Type': 'application/json' },
  });
};
