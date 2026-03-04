import { createHash, randomBytes } from 'node:crypto';
import { pgQuery } from '../db/pg-client';
import { isSystemRole } from './roles';
import { signAuthToken } from './token-service';
import type { UserContext } from './rbac-service';
import type { RefreshServiceOptions, RefreshTokenService, TokenPair } from './refresh-token-service';

interface RotateRow {
  user_id: string;
  role: string;
}

function nowPlusSeconds(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000);
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

function toUserContext(row: RotateRow): UserContext | null {
  if (!isSystemRole(row.role)) return null;
  return { userId: row.user_id, role: row.role };
}

export class PostgresRefreshTokenService implements RefreshTokenService {
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;

  constructor(options: RefreshServiceOptions = {}) {
    this.accessTtlSeconds = options.accessTtlSeconds ?? 900;
    this.refreshTtlSeconds = options.refreshTtlSeconds ?? 1209600;
  }

  async issue(user: UserContext): Promise<TokenPair> {
    const pair = buildTokenPair(user, this.accessTtlSeconds, this.refreshTtlSeconds);

    const sql = `
      insert into auth_refresh_sessions (
        token_hash, user_id, role, expires_at
      ) values ($1, $2, $3, $4)
    `;

    const params = [tokenHash(pair.refreshToken), user.userId, user.role, nowPlusSeconds(this.refreshTtlSeconds)];
    await pgQuery(sql, params);

    return pair;
  }

  async rotate(refreshToken: string): Promise<TokenPair | null> {
    const rotateSql = `
      update auth_refresh_sessions
      set revoked_at = now(), updated_at = now()
      where token_hash = $1
        and revoked_at is null
        and expires_at > now()
      returning user_id, role
    `;

    const rotated = await pgQuery<RotateRow>(rotateSql, [tokenHash(refreshToken)]);
    const row = rotated.rows[0];
    if (!row) return null;

    const user = toUserContext(row);
    if (!user) return null;

    const pair = buildTokenPair(user, this.accessTtlSeconds, this.refreshTtlSeconds);
    const insertSql = `
      insert into auth_refresh_sessions (
        token_hash, user_id, role, expires_at
      ) values ($1, $2, $3, $4)
    `;

    const params = [tokenHash(pair.refreshToken), user.userId, user.role, nowPlusSeconds(this.refreshTtlSeconds)];
    await pgQuery(insertSql, params);
    return pair;
  }

  async revoke(refreshToken: string): Promise<boolean> {
    const sql = `
      update auth_refresh_sessions
      set revoked_at = now(), updated_at = now()
      where token_hash = $1 and revoked_at is null
    `;

    const result = await pgQuery(sql, [tokenHash(refreshToken)]);
    return (result.rowCount ?? 0) > 0;
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const sql = `
      update auth_refresh_sessions
      set revoked_at = now(), updated_at = now()
      where user_id = $1
        and revoked_at is null
        and expires_at > now()
    `;

    const result = await pgQuery(sql, [userId]);
    return result.rowCount ?? 0;
  }

  async pruneExpired(): Promise<number> {
    const sql = 'delete from auth_refresh_sessions where expires_at <= now()';
    const result = await pgQuery(sql);
    return result.rowCount ?? 0;
  }
}
