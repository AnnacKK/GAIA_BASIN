import { getFileInfo, REPO_USER } from '../../lib/github.js';

const MASTER_TOKEN = import.meta.env.GITHUB_TOKEN;

export const GET = async ({ request }) => {
  const url = new URL(request.url);
  const path = url.searchParams.get('path');
  if (!path) return new Response('Missing path', { status: 400 });

  try {
    const info = await getFileInfo(MASTER_TOKEN, REPO_USER, path);
    if (!info || !info.content) throw new Error("File not found");
    const content = Buffer.from(info.content, 'base64').toString('utf8');
    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
};
