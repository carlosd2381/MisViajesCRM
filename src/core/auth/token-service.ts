import * as jwt from 'jsonwebtoken';
import { isSystemRole } from './roles';
import type { UserContext } from './rbac-service';
import { getJwtConfig } from './jwt-config';

interface DecodedHeader {
  kid?: string;
}

interface AuthClaims extends jwt.JwtPayload {
  role?: string;
}

function selectSecretByKid(kid?: string): string | null {
  const config = getJwtConfig();
  const keyId = kid ?? config.defaultKid;
  return config.keyring[keyId] ?? null;
}

function decodeHeader(token: string): DecodedHeader {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded !== 'object') return {};

  const header = decoded.header as DecodedHeader | undefined;
  return header ?? {};
}

function verifyWithSecret(token: string, secret: string): AuthClaims | null {
  try {
    const config = getJwtConfig();
    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: config.issuer,
      audience: config.audience
    }) as AuthClaims;

    return payload;
  } catch {
    return null;
  }
}

function toUserContext(payload: AuthClaims): UserContext | null {
  if (!payload.sub || !payload.role || !isSystemRole(payload.role)) {
    return null;
  }

  return {
    userId: String(payload.sub),
    role: payload.role
  };
}

export function signAuthToken(user: UserContext, ttlSeconds = 3600): string {
  const config = getJwtConfig();
  const secret = config.keyring[config.defaultKid];

  return jwt.sign({ role: user.role }, secret, {
    algorithm: 'HS256',
    keyid: config.defaultKid,
    subject: user.userId,
    issuer: config.issuer,
    audience: config.audience,
    expiresIn: ttlSeconds
  });
}

export function verifyAuthToken(token: string): UserContext | null {
  const header = decodeHeader(token);
  const secret = selectSecretByKid(header.kid);
  if (!secret) return null;

  const payload = verifyWithSecret(token, secret);
  if (!payload) return null;

  return toUserContext(payload);
}
