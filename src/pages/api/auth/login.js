import { randomState, buildCookie, signPayload } from '../../../lib/auth.js';
import { getGitHubUser } from '../../../lib/github.js';

export const GET = async ({ request }) => {
  const clientId = import.meta.env.GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID;
  const clientSecret = import.meta.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET;
  const tokenFallback = import.meta.env.GITHUB_TOKEN || process.env.GITHUB_TOKEN;

  const url = new URL(request.url);
  const secure = url.protocol === 'https:';

  if (!clientId || !clientSecret) {
    if (!tokenFallback) {
      return new Response('Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET. Set these in your .env file to enable GitHub login.', { status: 500 });
    }

    try {
      const user = await getGitHubUser(tokenFallback);
      const sessionPayload = {
        access_token: tokenFallback,
        exp: Date.now() + 1000 * 60 * 60 * 24,
      };
      const signedSession = buildCookie('gh_session', signPayload(sessionPayload), {
        httpOnly: true,
        secure,
        sameSite: 'Lax',
        maxAge: 60 * 60 * 24,
      });
      return new Response(null, {
        status: 302,
        headers: {
          Location: '/',
          'Set-Cookie': signedSession,
        },
      });
    } catch (error) {
      return new Response(`GitHub token login failed: ${error.message}`, { status: 500 });
    }
  }

  const redirectUri = 'https://tvzfv1br-4321.euw.devtunnels.ms/api/auth/callback';
  const state = randomState();
  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', 'read:user public_repo');
  authorizeUrl.searchParams.set('state', state);

  const cookie = buildCookie('gh_oauth_state', state, {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    maxAge: 300,
  });

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.toString(),
      'Set-Cookie': cookie,
    },
  });
};
