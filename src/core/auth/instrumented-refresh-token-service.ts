import type { RefreshTokenService, TokenPair } from './refresh-token-service';
import { RefreshTokenMetrics } from './refresh-token-metrics';
import type { UserContext } from './rbac-service';

function recordBool(metrics: RefreshTokenMetrics, operation: 'revoke' | 'rotate', success: boolean): void {
  metrics.record(operation, success ? 'success' : 'failure');
}

export class InstrumentedRefreshTokenService implements RefreshTokenService {
  constructor(
    private readonly base: RefreshTokenService,
    private readonly metrics: RefreshTokenMetrics
  ) {}

  async issue(user: UserContext): Promise<TokenPair> {
    const pair = await this.base.issue(user);
    this.metrics.record('issue', 'success');
    return pair;
  }

  async rotate(refreshToken: string): Promise<TokenPair | null> {
    const pair = await this.base.rotate(refreshToken);
    recordBool(this.metrics, 'rotate', Boolean(pair));
    return pair;
  }

  async revoke(refreshToken: string): Promise<boolean> {
    const revoked = await this.base.revoke(refreshToken);
    recordBool(this.metrics, 'revoke', revoked);
    return revoked;
  }

  async revokeAllForUser(userId: string): Promise<number> {
    const revokedCount = await this.base.revokeAllForUser(userId);
    this.metrics.record('revokeAllForUser', revokedCount > 0 ? 'success' : 'failure', Math.max(revokedCount, 1));
    return revokedCount;
  }

  async pruneExpired(): Promise<number> {
    const deletedCount = await this.base.pruneExpired();
    this.metrics.record('pruneExpired', deletedCount > 0 ? 'success' : 'failure', Math.max(deletedCount, 1));
    return deletedCount;
  }
}
