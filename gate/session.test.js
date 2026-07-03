// Crypto unit tests for the gate session token. Run with `node --test gate/`.
// Deliberately OUTSIDE the vitest surface (src/**) so the SPA's 165-test floor
// is unaffected — this is the middleware's own, separate proof.

import test from 'node:test';
import assert from 'node:assert/strict';
import { signSession, verifySession, timingSafeEqual } from './session.js';

const SECRET = 'unit-test-secret-do-not-ship';
const TTL = 3600;
const T0 = 1_700_000_000_000; // fixed clock (ms)

test('a freshly signed token verifies', async () => {
  const token = await signSession(SECRET, TTL, T0);
  assert.equal(await verifySession(SECRET, token, T0), true);
});

test('a token is rejected once expired', async () => {
  const token = await signSession(SECRET, 10, T0);
  assert.equal(await verifySession(SECRET, token, T0 + 11_000), false);
  // still valid one second before expiry
  assert.equal(await verifySession(SECRET, token, T0 + 9_000), true);
});

test('a token signed with a different secret is rejected', async () => {
  const token = await signSession(SECRET, TTL, T0);
  assert.equal(await verifySession('some-other-secret', token, T0), false);
});

test('a tampered payload is rejected', async () => {
  const token = await signSession(SECRET, TTL, T0);
  const [payload, sig] = token.split('.');
  const flipped = payload.slice(0, -1) + (payload.endsWith('A') ? 'B' : 'A');
  assert.equal(await verifySession(SECRET, `${flipped}.${sig}`, T0), false);
});

test('a tampered signature is rejected', async () => {
  const token = await signSession(SECRET, TTL, T0);
  const [payload, sig] = token.split('.');
  const flipped = sig.slice(0, -1) + (sig.endsWith('A') ? 'B' : 'A');
  assert.equal(await verifySession(SECRET, `${payload}.${flipped}`, T0), false);
});

test('garbage and empty tokens are rejected without throwing', async () => {
  assert.equal(await verifySession(SECRET, 'not-a-token', T0), false);
  assert.equal(await verifySession(SECRET, '', T0), false);
  assert.equal(await verifySession(SECRET, 'a.b.c', T0), false);
  assert.equal(await verifySession('', 'x.y', T0), false);
});

test('timingSafeEqual matches only identical equal-length strings', () => {
  assert.equal(timingSafeEqual('abcd', 'abcd'), true);
  assert.equal(timingSafeEqual('abcd', 'abce'), false);
  assert.equal(timingSafeEqual('abc', 'abcd'), false);
  assert.equal(timingSafeEqual('', ''), true);
});
