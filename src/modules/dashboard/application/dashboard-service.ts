import type {
  CreateDashboardSnapshotRequest,
  UpdateDashboardSnapshotRequest
} from '../api/dashboard-contracts';
import type { DashboardSnapshot } from '../domain/dashboard-snapshot';

function nowIsoDate(): string {
  return new Date().toISOString();
}

function createEntityId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

export function mapCreateDashboardSnapshotToEntity(input: CreateDashboardSnapshotRequest): DashboardSnapshot {
  const timestamp = nowIsoDate();

  return {
    id: createEntityId('dash'),
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function mapUpdateDashboardSnapshotToEntity(
  current: DashboardSnapshot,
  input: UpdateDashboardSnapshotRequest
): DashboardSnapshot {
  return {
    ...current,
    ...input,
    updatedAt: nowIsoDate()
  };
}
