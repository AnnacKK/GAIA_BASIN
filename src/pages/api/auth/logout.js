import { buildCookie } from '../../../lib/auth.js';

export const GET = async ({ request }) => {
  const url = new URL(request.url);
  const secure = url.protocol === 'https:';
  const cookie = buildCookie('gh_session', '', {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    maxAge: 0,
  });
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/',
      'Set-Cookie': cookie,
    },
  });
};
