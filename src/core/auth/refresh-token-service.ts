import { createHash, randomBytes } from 'node:crypto';
import type { UserContext } from './rbac-service';
import { signAuthToken } from './token-service';

interface RefreshSession {
  user: UserContext;
  expiresAt: number;
  revokedAt: number | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  refreshExpiresIn: number;
}

export interface RefreshTokenService {
  issue(user: UserContext): Promise<TokenPair> | TokenPair;
  rotate(refreshToken: string): Promise<TokenPair | null> | TokenPair | null;
  revoke(refreshToken: string): Promise<boolean> | boolean;
  revokeAllForUser(userId: string): Promise<number> | number;
  pruneExpired(): Promise<number> | number;
}

export interface RefreshServiceOptions {
  accessTtlSeconds?: number;
  refreshTtlSeconds?: number;
}

function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function tokenHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function newRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

function buildTokenPair(user: UserContext, accessTtlSeconds: number, refreshTtlSeconds: number): TokenPair {
  return {
    accessToken: signAuthToken(user, accessTtlSeconds),
    refreshToken: newRefreshToken(),
    accessExpiresIn: accessTtlSeconds,
    refreshExpiresIn: refreshTtlSeconds
  };
}

function isSessionValid(session: RefreshSession): boolean {
  if (session.revokedAt) return false;
  return session.expiresAt > nowInSeconds();
}

export class InMemoryRefreshTokenService implements RefreshTokenService {
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;
  private readonly sessions = new Map<string, RefreshSession>();

  constructor(options: RefreshServiceOptions = {}) {
    this.accessTtlSeconds = options.accessTtlSeconds ?? 900;
    this.refreshTtlSeconds = options.refreshTtlSeconds ?? 1209600;
  }

  issue(user: UserContext): TokenPair {
    const pair = buildTokenPair(user, this.accessTtlSeconds, this.refreshTtlSeconds);

    this.sessions.set(tokenHash(pair.refreshToken), {
      user,
      expiresAt: nowInSeconds() + this.refreshTtlSeconds,
      revokedAt: null
    });

    return pair;
  }

  rotate(refreshToken: string): TokenPair | null {
    const hash = tokenHash(refreshToken);
    const session = this.sessions.get(hash);
    if (!session || !isSessionValid(session)) return null;

    session.revokedAt = nowInSeconds();

    const pair = buildTokenPair(session.user, this.accessTtlSeconds, this.refreshTtlSeconds);
    this.sessions.set(tokenHash(pair.refreshToken), {
      user: session.user,
      expiresAt: nowInSeconds() + this.refreshTtlSeconds,
      revokedAt: null
    });

    return pair;
  }

  revoke(refreshToken: string): boolean {
    const session = this.sessions.get(tokenHash(refreshToken));
    if (!session || session.revokedAt) return false;

    session.revokedAt = nowInSeconds();
    return true;
  }

  revokeAllForUser(userId: string): number {
    const now = nowInSeconds();
    let revokedCount = 0;

    for (const session of this.sessions.values()) {
      if (session.user.userId !== userId) continue;
      if (session.revokedAt || session.expiresAt <= now) continue;

      session.revokedAt = now;
      revokedCount += 1;
    }

    return revokedCount;
  }

  pruneExpired(): number {
    const now = nowInSeconds();
    let deletedCount = 0;

    for (const [key, session] of this.sessions.entries()) {
      if (session.expiresAt > now) continue;
      this.sessions.delete(key);
      deletedCount += 1;
    }

    return deletedCount;
  }
}
