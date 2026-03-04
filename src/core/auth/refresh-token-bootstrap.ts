import { InMemoryRefreshTokenService, type RefreshServiceOptions, type RefreshTokenService } from './refresh-token-service';
import { PostgresRefreshTokenService } from './postgres-refresh-token-service';

export function buildRefreshTokenService(options: RefreshServiceOptions): RefreshTokenService {
  const storageMode = process.env.STORAGE_MODE ?? 'memory';
  if (storageMode === 'postgres') {
    return new PostgresRefreshTokenService(options);
  }

  return new InMemoryRefreshTokenService(options);
}
