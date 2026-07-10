import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

console.log("Checking environment variables...");
console.log("AUTH_SECRET exists:", !!import.meta.env.AUTH_SECRET);
const SECRET = import.meta.env.AUTH_SECRET|| process.env.AUTH_SECRET;

if (!SECRET) {
  throw new Error('AUTH_SECRET is missing! Please set it in your .env file.');
}

export function randomState() {
  return randomBytes(16).toString('hex');
}

export function signPayload(payload) {
  const data = JSON.stringify(payload);
  const signature = createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${Buffer.from(data, 'utf8').toString('base64url')}.${signature}`;
}

export function verifyPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const [dataPart, signature] = token.split('.');
  if (!dataPart || !signature) return null;
  try {
    const data = Buffer.from(dataPart, 'base64url').toString('utf8');
    const expected = createHmac('sha256', SECRET).update(data).digest('base64url');
    if (!timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(expected, 'utf8'))) {
      return null;
    }
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader) {
  return (cookieHeader || '').split(';').reduce((cookies, pair) => {
    const [key, ...rest] = pair.split('=');
    if (!key) return cookies;
    cookies[key.trim()] = decodeURIComponent(rest.join('=').trim());
    return cookies;
  }, {});
}

export function buildCookie(name, value, options = {}) {
  const attrs = [];
  attrs.push(`${name}=${value}`);
  attrs.push(`Path=${options.path || '/'}`);
  attrs.push(`SameSite=${options.sameSite || 'Lax'}`);
  if (options.httpOnly) attrs.push('HttpOnly');
  if (options.secure) attrs.push('Secure');
  if (options.maxAge) attrs.push(`Max-Age=${options.maxAge}`);
  if (options.domain) attrs.push(`Domain=${options.domain}`);
  return attrs.join('; ');
}
