export const MOBILE_GOOGLE_REDIRECT = 'quanlythietbi://auth/google';
export const GOOGLE_ATTEMPT_KEY = 'google_browser_attempt';
export const GOOGLE_ATTEMPT_TTL = 10 * 60 * 1000;
export interface GoogleAttempt { state: string; verifier: string; returnPath: string; expires: number }
const opaquePattern = /^[A-Za-z0-9_-]{43}$/;

export function readGoogleAttempt(raw: string | null, now = Date.now()): GoogleAttempt | null {
  try {
    const value = JSON.parse(raw || 'null');
    if (!value || typeof value.state !== 'string' || typeof value.verifier !== 'string' || !opaquePattern.test(value.state) || !opaquePattern.test(value.verifier) ||
        typeof value.expires !== 'number' || value.expires <= now || value.expires > now + GOOGLE_ATTEMPT_TTL ||
        typeof value.returnPath !== 'string' || !value.returnPath.startsWith('/') || value.returnPath.startsWith('//')) return null;
    return value;
  } catch { return null; }
}

export function parseGoogleReturn(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'quanlythietbi:' || url.hostname !== 'auth' || url.pathname !== '/google' ||
        url.username || url.password || url.port || url.hash) return null;
    if (Array.from(url.searchParams.keys()).some(key => !['state', 'code', 'error'].includes(key))) return null;
    for (const key of ['state', 'code', 'error']) if (url.searchParams.getAll(key).length > 1) return null;
    const state = url.searchParams.get('state');
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    if (!state || !opaquePattern.test(state) || (!!code === !!error) ||
        (code && !opaquePattern.test(code)) || (error && !['cancelled', 'failed'].includes(error))) return null;
    return { state, code, error };
  } catch { return null; }
}

export async function createGoogleProof() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const encode = (value: Uint8Array) => btoa(String.fromCharCode(...value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const verifier = encode(bytes);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: encode(new Uint8Array(digest)) };
}
