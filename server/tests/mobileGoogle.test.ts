import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { AddressInfo } from 'node:net';
import { challengeFor, createGoogleProvider, GoogleProvider, MobileGoogleError, MobileGoogleFlow } from '../src/auth/mobileGoogle';
import { createMobileGoogleRouter } from '../src/routes/googleMobile';

const verifier = 'a'.repeat(43);
const identity = { sub: 'test-sub', email: 'student@example.test', name: 'Test Student' };
const provider: GoogleProvider = {
  authorizationUrl: state => `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`,
  verifyCode: async () => identity
};
function createFlow() { return new MobileGoogleFlow(() => provider); }
function failure(status: number) { return (error: unknown) => error instanceof MobileGoogleError && error.status === status; }

test('start requires a valid S256 challenge and returns unpredictable states', () => {
  const flow = createFlow();
  assert.throws(() => flow.start(undefined), failure(400));
  assert.throws(() => flow.start('plain-verifier'), failure(400));
  const first = flow.start(challengeFor(verifier));
  const second = flow.start(challengeFor(verifier));
  assert.notEqual(first.state, second.state);
  assert.match(first.state, /^[A-Za-z0-9_-]{43}$/);
});

test('callback produces a proof-bound one-time code, not a Google or app token', async () => {
  const flow = createFlow();
  const { state } = flow.start(challengeFor(verifier));
  const url = new URL(await flow.callback(state, 'google-authorization-code', undefined));
  assert.equal(url.origin, 'null');
  assert.equal(url.protocol, 'quanlythietbi:');
  assert.equal(url.host, 'auth');
  assert.equal(url.pathname, '/google');
  assert.equal(url.searchParams.get('state'), state);
  const code = url.searchParams.get('code')!;
  assert.match(code, /^[A-Za-z0-9_-]{43}$/);
  assert.ok(!url.toString().includes('google-authorization-code'));
  assert.throws(() => flow.redeem(code, state, 'b'.repeat(43)), failure(401));
  assert.throws(() => flow.redeem(code, 'wrong-state', verifier), failure(401));
  assert.deepEqual(flow.redeem(code, state, verifier), identity);
  assert.throws(() => flow.redeem(code, state, verifier), failure(401));
  await assert.rejects(flow.callback(state, 'code', undefined), failure(400));
});

test('callback requires a known state and refuses array parameters', async () => {
  const flow = createFlow();
  await assert.rejects(flow.callback('unknown', 'code', undefined), failure(400));
  await assert.rejects(flow.callback(['unknown'], 'code', undefined), failure(400));
});

test('cancellation and provider failures do not create redeemable codes', async () => {
  const flow = createFlow();
  const { state } = flow.start(challengeFor(verifier));
  const cancelled = new URL(await flow.callback(state, undefined, 'access_denied'));
  assert.equal(cancelled.searchParams.get('error'), 'cancelled');
  assert.equal(cancelled.searchParams.has('code'), false);
  const failing = new MobileGoogleFlow(() => ({ ...provider, verifyCode: async () => { throw new Error('SECRET_TOKEN'); } }));
  const next = failing.start(challengeFor(verifier));
  const failed = await failing.callback(next.state, 'code', undefined);
  assert.ok(failed.includes('error=failed'));
  assert.ok(!failed.includes('SECRET_TOKEN'));
});

test('authorization attempts and handoffs expire', async () => {
  let now = 1000;
  const flow = new MobileGoogleFlow(() => provider, () => now);
  const first = flow.start(challengeFor(verifier));
  now += 10 * 60 * 1000;
  await assert.rejects(flow.callback(first.state, 'code', undefined), failure(400));
  const second = flow.start(challengeFor(verifier));
  const code = new URL(await flow.callback(second.state, 'code', undefined)).searchParams.get('code');
  now += 2 * 60 * 1000;
  assert.throws(() => flow.redeem(code, second.state, verifier), failure(401));
});

test('concurrent callback replay can only exchange with Google once', async () => {
  let verifyCount = 0;
  const flow = new MobileGoogleFlow(() => ({ ...provider, verifyCode: async () => { verifyCount++; await new Promise(r => setTimeout(r, 10)); return identity; } }));
  const { state } = flow.start(challengeFor(verifier));
  const results = await Promise.allSettled([flow.callback(state, 'code', undefined), flow.callback(state, 'code', undefined)]);
  assert.equal(verifyCount, 1);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
});

test('attempt store is bounded and frees expired entries', () => {
  let now = 0;
  const flow = new MobileGoogleFlow(() => provider, () => now);
  for (let i = 0; i < 1000; i++) flow.start(challengeFor(verifier));
  assert.throws(() => flow.start(challengeFor(verifier)), failure(429));
  now = 10 * 60 * 1000;
  assert.ok(flow.start(challengeFor(verifier)).state);
});

test('Google authorization URL uses HTTPS callback, state, nonce and PKCE', () => {
  const names = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_MOBILE_REDIRECT_URI'];
  const old = names.map(name => process.env[name]);
  try {
    process.env.GOOGLE_CLIENT_ID = 'example.apps.googleusercontent.com';
    process.env.GOOGLE_CLIENT_SECRET = 'test-only-secret';
    process.env.GOOGLE_MOBILE_REDIRECT_URI = 'https://api.example.test/api/auth/google/mobile/callback';
    const url = new URL(createGoogleProvider().authorizationUrl('state', 'nonce', verifier));
    assert.equal(url.hostname, 'accounts.google.com');
    assert.equal(url.searchParams.get('redirect_uri'), process.env.GOOGLE_MOBILE_REDIRECT_URI);
    assert.equal(url.searchParams.get('nonce'), 'nonce');
    assert.equal(url.searchParams.get('state'), 'state');
    assert.equal(url.searchParams.get('code_challenge'), challengeFor(verifier));
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(url.searchParams.get('scope'), 'openid email profile');
    assert.equal(url.toString().includes('test-only-secret'), false);
    delete process.env.GOOGLE_CLIENT_SECRET;
    assert.throws(createGoogleProvider, failure(503));
    process.env.GOOGLE_CLIENT_SECRET = 'test-only-secret';
    process.env.GOOGLE_MOBILE_REDIRECT_URI = 'https://api.example.test/incorrect';
    assert.throws(createGoogleProvider, failure(503));
  } finally {
    names.forEach((name, index) => { if (old[index] === undefined) delete process.env[name]; else process.env[name] = old[index]; });
  }
});

test('HTTP flow returns no-store callback with return link and only issues session after proof', async () => {
  let sessions = 0;
  const app = express();
  app.use(express.json());
  app.use('/api/auth/google/mobile', createMobileGoogleRouter(async user => { sessions++; return { token: 'test-app-jwt', user }; }, createFlow()));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/auth/google/mobile`;
  const post = (path: string, body: unknown) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    const start = await post('/start', { code_challenge: challengeFor(verifier) });
    const { data } = await start.json() as any;
    const callback = await fetch(`${base}/callback?state=${data.state}&code=test-google-code`);
    assert.equal(callback.headers.get('cache-control'), 'no-store');
    assert.equal(callback.headers.get('referrer-policy'), 'no-referrer');
    assert.match(callback.headers.get('content-security-policy')!, /frame-ancestors 'none'/);
    const html = await callback.text();
    assert.ok(!html.includes('test-app-jwt') && !html.includes('test-google-code'));
    const href = html.match(/href="([^"]+)"/)![1].replace(/&amp;/g, '&');
    const code = new URL(href).searchParams.get('code');
    const rejected = await post('/exchange', { code, state: data.state, code_verifier: 'b'.repeat(43) });
    assert.equal(rejected.status, 401);
    assert.equal(sessions, 0);
    const accepted = await post('/exchange', { code, state: data.state, code_verifier: verifier });
    assert.equal(accepted.status, 200);
    assert.equal((await accepted.json() as any).data.token, 'test-app-jwt');
    assert.equal(sessions, 1);
    assert.equal((await post('/exchange', { code, state: data.state, code_verifier: verifier })).status, 401);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
