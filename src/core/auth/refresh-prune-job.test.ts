import test from 'node:test';
import assert from 'node:assert/strict';
import type { UserContext } from './rbac-service';
import { startRefreshPruneJob } from './refresh-prune-job';
import type { RefreshTokenService, TokenPair } from './refresh-token-service';

function tokenPair(): TokenPair {
  return {
    accessToken: 'a',
    refreshToken: 'r',
    accessExpiresIn: 1,
    refreshExpiresIn: 1
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class MockRefreshService implements RefreshTokenService {
  pruneCalls = 0;

  issue(_: UserContext): TokenPair {
    return tokenPair();
  }

  rotate(): TokenPair | null {
    return tokenPair();
  }

  revoke(): boolean {
    return true;
  }

  revokeAllForUser(): number {
    return 0;
  }

  pruneExpired(): number {
    this.pruneCalls += 1;
    return this.pruneCalls;
  }
}

test('prune job does not run when disabled', async () => {
  const service = new MockRefreshService();
  const stop = startRefreshPruneJob(service, { enabled: false, intervalMs: 10 });

  await wait(40);
  stop();

  assert.equal(service.pruneCalls, 0);
});

test('prune job runs periodically when enabled', async () => {
  const service = new MockRefreshService();
  const stop = startRefreshPruneJob(service, { enabled: true, intervalMs: 10 });

  await wait(1100);
  stop();

  assert.ok(service.pruneCalls >= 1);
});
