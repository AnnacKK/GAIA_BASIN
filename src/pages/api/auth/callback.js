import { buildCookie, signPayload } from '../../../lib/auth.js';

export const GET = async ({ request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return new Response('Missing code or state', { status: 400 });
  }

  const cookies = request.headers.get('cookie') || '';
  const storedState = cookies.split(';').map(part => part.trim()).find(part => part.startsWith('gh_oauth_state='));
  if (!storedState) {
    return new Response('State cookie is missing', { status: 400 });
  }

  const [, stateValue] = storedState.split('=');
  if (stateValue !== state) {
    return new Response('Invalid OAuth state', { status: 403 });
  }

  const clientId = import.meta.env.GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID;
  const clientSecret = import.meta.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response('Missing GitHub OAuth credentials', { status: 500 });
  }

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      state,
    }),
  });

  if (!tokenResponse.ok) {
    return new Response('Failed to exchange GitHub code', { status: 500 });
  }

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    return new Response('No access token returned', { status: 500 });
  }

  const sessionPayload = {
    access_token: tokenData.access_token,
    exp: Date.now() + 1000 * 60 * 60 * 24,
  };
  const signedSession = buildCookie('gh_session', signPayload(sessionPayload), {
    httpOnly: true,
    secure: url.protocol === 'https:',
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24,
  });
  const clearStateCookie = buildCookie('gh_oauth_state', '', {
    httpOnly: true,
    secure: url.protocol === 'https:',
    sameSite: 'Lax',
    maxAge: 0,
  });

  const responseHeaders = new Headers();
  responseHeaders.append('Location', '/');
  responseHeaders.append('Set-Cookie', signedSession);
  responseHeaders.append('Set-Cookie', clearStateCookie);

  return new Response(null, {
    status: 302,
    headers: responseHeaders,
  });
};
