import { pgQuery } from '../../../core/db/pg-client';
import type { DashboardRepository } from '../domain/dashboard-repository';
import type { DashboardSnapshot } from '../domain/dashboard-snapshot';

interface DashboardRow {
  id: string;
  period_start: string;
  period_end: string;
  leads_total: number;
  leads_won: number;
  itineraries_accepted: number;
  commissions_pending: number;
  commissions_paid: number;
  revenue_mxn: number;
  profit_mxn: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: DashboardRow): DashboardSnapshot {
  return {
    id: row.id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    leadsTotal: row.leads_total,
    leadsWon: row.leads_won,
    itinerariesAccepted: row.itineraries_accepted,
    commissionsPending: row.commissions_pending,
    commissionsPaid: row.commissions_paid,
    revenueMxn: row.revenue_mxn,
    profitMxn: row.profit_mxn,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class PostgresDashboardRepository implements DashboardRepository {
  async list(): Promise<DashboardSnapshot[]> {
    const sql = 'select * from dashboard_snapshots order by period_start desc';
    const result = await pgQuery<DashboardRow>(sql);
    return result.rows.map(mapRow);
  }

  async getById(id: string): Promise<DashboardSnapshot | null> {
    const sql = 'select * from dashboard_snapshots where id = $1';
    const result = await pgQuery<DashboardRow>(sql, [id]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async create(entity: DashboardSnapshot): Promise<DashboardSnapshot> {
    const sql = `
      insert into dashboard_snapshots (
        id, period_start, period_end, leads_total, leads_won,
        itineraries_accepted, commissions_pending, commissions_paid,
        revenue_mxn, profit_mxn, created_at, updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      ) returning *
    `;

    const params = [
      entity.id,
      entity.periodStart,
      entity.periodEnd,
      entity.leadsTotal,
      entity.leadsWon,
      entity.itinerariesAccepted,
      entity.commissionsPending,
      entity.commissionsPaid,
      entity.revenueMxn,
      entity.profitMxn,
      entity.createdAt,
      entity.updatedAt
    ];

    const result = await pgQuery<DashboardRow>(sql, params);
    return mapRow(result.rows[0]);
  }

  async update(entity: DashboardSnapshot): Promise<DashboardSnapshot> {
    const sql = `
      update dashboard_snapshots set
        leads_total = $2,
        leads_won = $3,
        itineraries_accepted = $4,
        commissions_pending = $5,
        commissions_paid = $6,
        revenue_mxn = $7,
        profit_mxn = $8,
        updated_at = $9
      where id = $1
      returning *
    `;

    const params = [
      entity.id,
      entity.leadsTotal,
      entity.leadsWon,
      entity.itinerariesAccepted,
      entity.commissionsPending,
      entity.commissionsPaid,
      entity.revenueMxn,
      entity.profitMxn,
      entity.updatedAt
    ];

    const result = await pgQuery<DashboardRow>(sql, params);
    return mapRow(result.rows[0]);
  }
}
