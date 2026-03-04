import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryRefreshTokenService } from './refresh-token-service';
import { verifyAuthToken } from './token-service';

test('issue returns usable access and refresh token pair', () => {
  const service = new InMemoryRefreshTokenService({ accessTtlSeconds: 120, refreshTtlSeconds: 300 });
  const pair = service.issue({ userId: 'u1', role: 'agent' });

  assert.equal(typeof pair.accessToken, 'string');
  assert.equal(typeof pair.refreshToken, 'string');
  assert.equal(pair.accessExpiresIn, 120);
  assert.equal(pair.refreshExpiresIn, 300);

  const user = verifyAuthToken(pair.accessToken);
  assert.deepEqual(user, { userId: 'u1', role: 'agent' });
});

test('rotate invalidates old refresh token and returns new pair', () => {
  const service = new InMemoryRefreshTokenService({ accessTtlSeconds: 120, refreshTtlSeconds: 300 });
  const first = service.issue({ userId: 'u2', role: 'manager' });

  const second = service.rotate(first.refreshToken);
  assert.ok(second);
  if (!second) return;

  assert.notEqual(second.refreshToken, first.refreshToken);
  assert.equal(service.rotate(first.refreshToken), null);

  const user = verifyAuthToken(second.accessToken);
  assert.deepEqual(user, { userId: 'u2', role: 'manager' });
});

test('revoke disables future rotation', () => {
  const service = new InMemoryRefreshTokenService({ accessTtlSeconds: 120, refreshTtlSeconds: 300 });
  const pair = service.issue({ userId: 'u3', role: 'owner' });

  assert.equal(service.revoke(pair.refreshToken), true);
  assert.equal(service.revoke(pair.refreshToken), false);
  assert.equal(service.rotate(pair.refreshToken), null);
});

test('revokeAllForUser revokes active sessions for target user only', () => {
  const service = new InMemoryRefreshTokenService({ accessTtlSeconds: 120, refreshTtlSeconds: 300 });
  const u1a = service.issue({ userId: 'u1', role: 'agent' });
  const u1b = service.issue({ userId: 'u1', role: 'agent' });
  const u2 = service.issue({ userId: 'u2', role: 'manager' });

  const revokedCount = service.revokeAllForUser('u1');
  assert.equal(revokedCount, 2);
  assert.equal(service.rotate(u1a.refreshToken), null);
  assert.equal(service.rotate(u1b.refreshToken), null);
  assert.ok(service.rotate(u2.refreshToken));
});

test('pruneExpired deletes expired sessions', () => {
  const service = new InMemoryRefreshTokenService({ accessTtlSeconds: 120, refreshTtlSeconds: -1 });
  const expired = service.issue({ userId: 'u1', role: 'agent' });

  const deletedCount = service.pruneExpired();
  assert.equal(deletedCount, 1);
  assert.equal(service.rotate(expired.refreshToken), null);
});
