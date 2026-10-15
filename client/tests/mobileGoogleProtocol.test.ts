import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createGoogleProof, GOOGLE_ATTEMPT_TTL, parseGoogleReturn, readGoogleAttempt } from '../src/services/mobileGoogleProtocol';
const state = 's'.repeat(43);
const code = 'c'.repeat(43);
test('app proof is random and matches standard S256', async () => {
  const first = await createGoogleProof();
  const second = await createGoogleProof();
  assert.notEqual(first.verifier, second.verifier);
  assert.match(first.verifier, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(first.challenge, createHash('sha256').update(first.verifier).digest('base64url'));
});
test('only the exact Google return scheme, host and path are accepted', () => {
  assert.deepEqual(parseGoogleReturn(`quanlythietbi://auth/google?state=${state}&code=${code}`), { state, code, error: null });
  for (const prefix of ['https://auth/google', 'quanlythietbi://evil/google', 'quanlythietbi://auth/other', 'quanlythietbi://user@auth/google', 'quanlythietbi://auth:123/google']) {
    assert.equal(parseGoogleReturn(`${prefix}?state=${state}&code=${code}`), null);
  }
});
test('ambiguous, duplicate, malformed or token-bearing return values are rejected', () => {
  for (const query of [`state=${state}&state=${state}&code=${code}`, `state=${state}&code=${code}&error=failed`, `state=${state}`, `state=${state}&code=JWT.TOKEN.VALUE`, `state=${state}&error=arbitrary`, `code=${code}`]) {
    assert.equal(parseGoogleReturn(`quanlythietbi://auth/google?${query}`), null);
  }
});
test('cancellation is parsed separately from successful handoff', () => {
  assert.deepEqual(parseGoogleReturn(`quanlythietbi://auth/google?state=${state}&error=cancelled`), { state, code: null, error: 'cancelled' });
});
test('stored attempt accepts only unexpired bounded proofs and local paths', () => {
  const now = 1000;
  const attempt = { state, verifier: 'v'.repeat(43), returnPath: '/admin', expires: now + GOOGLE_ATTEMPT_TTL };
  assert.deepEqual(readGoogleAttempt(JSON.stringify(attempt), now), attempt);
  assert.equal(readGoogleAttempt(JSON.stringify(attempt), attempt.expires), null);
  for (const change of [{ returnPath: '//evil.test' }, { returnPath: 'https://evil.test' }, { expires: now + GOOGLE_ATTEMPT_TTL + 1 }, { verifier: 'invalid' }, { state: [] }]) {
    assert.equal(readGoogleAttempt(JSON.stringify({ ...attempt, ...change }), now), null);
  }
  assert.equal(readGoogleAttempt('{invalid'), null);
});
