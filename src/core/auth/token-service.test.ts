import test from 'node:test';
import assert from 'node:assert/strict';
import * as jwt from 'jsonwebtoken';
import { signAuthToken, verifyAuthToken } from './token-service';

test('token can be signed and verified', () => {
  const token = signAuthToken({ userId: 'u1', role: 'agent' }, 300);
  const user = verifyAuthToken(token);

  assert.deepEqual(user, { userId: 'u1', role: 'agent' });
});

test('token with invalid signature is rejected', () => {
  const token = signAuthToken({ userId: 'u1', role: 'agent' }, 300);
  const tampered = `${token}x`;
  const user = verifyAuthToken(tampered);

  assert.equal(user, null);
});

test('token with unknown kid is rejected', () => {
  const original = {
    AUTH_JWT_DEFAULT_KID: process.env.AUTH_JWT_DEFAULT_KID,
    AUTH_TOKEN_SECRET: process.env.AUTH_TOKEN_SECRET,
    AUTH_JWT_ISSUER: process.env.AUTH_JWT_ISSUER,
    AUTH_JWT_AUDIENCE: process.env.AUTH_JWT_AUDIENCE
  };

  try {
    process.env.AUTH_JWT_DEFAULT_KID = 'active';
    process.env.AUTH_TOKEN_SECRET = 'active-secret';
    process.env.AUTH_JWT_ISSUER = 'test.issuer';
    process.env.AUTH_JWT_AUDIENCE = 'test.audience';

    const token = jwt.sign({ role: 'agent' }, 'other-secret', {
      algorithm: 'HS256',
      keyid: 'missing-kid',
      subject: 'u1',
      issuer: 'test.issuer',
      audience: 'test.audience',
      expiresIn: 300
    });

    const user = verifyAuthToken(token);
    assert.equal(user, null);
  } finally {
    process.env.AUTH_JWT_DEFAULT_KID = original.AUTH_JWT_DEFAULT_KID;
    process.env.AUTH_TOKEN_SECRET = original.AUTH_TOKEN_SECRET;
    process.env.AUTH_JWT_ISSUER = original.AUTH_JWT_ISSUER;
    process.env.AUTH_JWT_AUDIENCE = original.AUTH_JWT_AUDIENCE;
  }
});
