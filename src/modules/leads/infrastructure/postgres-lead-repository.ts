import type { LeadRepository } from '../domain/lead-repository';
import type { Lead } from '../domain/lead';
import { pgQuery } from '../../../core/db/pg-client';

interface LeadRow {
  id: string;
  status: Lead['status'];
  source: Lead['source'];
  priority: Lead['priority'];
  destination: string;
  travel_start_date: string | null;
  travel_end_date: string | null;
  adults_count: number;
  children_count: number;
  budget_min: number | null;
  budget_max: number | null;
  budget_currency: Lead['budgetCurrency'] | null;
  trip_type: string | null;
  notes: string | null;
  assigned_agent_id: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: LeadRow): Lead {
  return {
    id: row.id,
    status: row.status,
    source: row.source,
    priority: row.priority,
    destination: row.destination,
    travelStartDate: row.travel_start_date ?? undefined,
    travelEndDate: row.travel_end_date ?? undefined,
    adultsCount: row.adults_count,
    childrenCount: row.children_count,
    budgetMin: row.budget_min ?? undefined,
    budgetMax: row.budget_max ?? undefined,
    budgetCurrency: row.budget_currency ?? undefined,
    tripType: row.trip_type ?? undefined,
    notes: row.notes ?? undefined,
    assignedAgentId: row.assigned_agent_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class PostgresLeadRepository implements LeadRepository {
  async list(): Promise<Lead[]> {
    const sql = 'select * from leads order by created_at desc';
    const result = await pgQuery<LeadRow>(sql);
    return result.rows.map(mapRow);
  }

  async getById(id: string): Promise<Lead | null> {
    const sql = 'select * from leads where id = $1';
    const result = await pgQuery<LeadRow>(sql, [id]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async create(entity: Lead): Promise<Lead> {
    const sql = `
      insert into leads (
        id, status, source, priority, destination, travel_start_date, travel_end_date,
        adults_count, children_count, budget_min, budget_max, budget_currency,
        trip_type, notes, assigned_agent_id, created_at, updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
      ) returning *
    `;

    const params = [
      entity.id,
      entity.status,
      entity.source,
      entity.priority,
      entity.destination,
      entity.travelStartDate ?? null,
      entity.travelEndDate ?? null,
      entity.adultsCount,
      entity.childrenCount,
      entity.budgetMin ?? null,
      entity.budgetMax ?? null,
      entity.budgetCurrency ?? null,
      entity.tripType ?? null,
      entity.notes ?? null,
      entity.assignedAgentId ?? null,
      entity.createdAt,
      entity.updatedAt
    ];

    const result = await pgQuery<LeadRow>(sql, params);
    return mapRow(result.rows[0]);
  }

  async update(entity: Lead): Promise<Lead> {
    const sql = `
      update leads set
        status = $2,
        source = $3,
        priority = $4,
        destination = $5,
        travel_start_date = $6,
        travel_end_date = $7,
        adults_count = $8,
        children_count = $9,
        budget_min = $10,
        budget_max = $11,
        budget_currency = $12,
        trip_type = $13,
        notes = $14,
        assigned_agent_id = $15,
        updated_at = $16
      where id = $1
      returning *
    `;

    const params = [
      entity.id,
      entity.status,
      entity.source,
      entity.priority,
      entity.destination,
      entity.travelStartDate ?? null,
      entity.travelEndDate ?? null,
      entity.adultsCount,
      entity.childrenCount,
      entity.budgetMin ?? null,
      entity.budgetMax ?? null,
      entity.budgetCurrency ?? null,
      entity.tripType ?? null,
      entity.notes ?? null,
      entity.assignedAgentId ?? null,
      entity.updatedAt
    ];

    const result = await pgQuery<LeadRow>(sql, params);
    return mapRow(result.rows[0]);
  }
}
