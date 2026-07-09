import { parseCookies, verifyPayload } from '../../../lib/auth.js';

export const GET = async ({ request }) => {
  const cookies = parseCookies(request.headers.get('cookie'));
  const signed = cookies.gh_session;
  if (!signed) {
    return new Response(JSON.stringify({ user: null }), { headers: { 'Content-Type': 'application/json' } });
  }

  const session = verifyPayload(signed);
  if (!session || !session.access_token || session.exp < Date.now()) {
    return new Response(JSON.stringify({ user: null }), { headers: { 'Content-Type': 'application/json' } });
  }

  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `token ${session.access_token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!userResponse.ok) {
    return new Response(JSON.stringify({ user: null }), { headers: { 'Content-Type': 'application/json' } });
  }

  const userData = await userResponse.json();
  return new Response(JSON.stringify({ user: {
    login: userData.login,
    avatar_url: userData.avatar_url || '',
    id: userData.id,
  } }), { headers: { 'Content-Type': 'application/json' } });
};
