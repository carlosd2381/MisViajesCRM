import type { RefreshTokenService } from './refresh-token-service';

export interface RefreshPruneJobOptions {
  enabled: boolean;
  intervalMs: number;
}

function noOp(): void {}

function safeInterval(value: number): number {
  if (!Number.isFinite(value) || value < 1000) return 1000;
  return Math.floor(value);
}

export function startRefreshPruneJob(
  service: RefreshTokenService,
  options: RefreshPruneJobOptions
): () => void {
  if (!options.enabled) return noOp;

  const intervalMs = safeInterval(options.intervalMs);
  const timer = setInterval(() => {
    void service.pruneExpired();
  }, intervalMs);

  timer.unref?.();
  return () => clearInterval(timer);
}
