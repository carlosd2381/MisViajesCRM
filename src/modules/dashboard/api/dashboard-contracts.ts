import type { DashboardSnapshot } from '../domain/dashboard-snapshot';

export interface CreateDashboardSnapshotRequest {
  periodStart: string;
  periodEnd: string;
  leadsTotal: number;
  leadsWon: number;
  itinerariesAccepted: number;
  commissionsPending: number;
  commissionsPaid: number;
  revenueMxn: number;
  profitMxn: number;
}

export interface UpdateDashboardSnapshotRequest {
  leadsTotal?: number;
  leadsWon?: number;
  itinerariesAccepted?: number;
  commissionsPending?: number;
  commissionsPaid?: number;
  revenueMxn?: number;
  profitMxn?: number;
}

export interface DashboardSnapshotResponse {
  data: DashboardSnapshot;
}

export interface DashboardSnapshotListResponse {
  data: DashboardSnapshot[];
}
