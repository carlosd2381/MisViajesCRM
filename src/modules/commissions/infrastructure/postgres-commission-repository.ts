import { pgQuery } from '../../../core/db/pg-client';
import type { Commission } from '../domain/commission';
import type { CommissionRepository } from '../domain/commission-repository';

interface CommissionRow {
  id: string;
  itinerary_id: string;
  supplier_id: string;
  expected_amount: number;
  actual_received: number | null;
  received_date: string | null;
  due_date: string;
  status: Commission['status'];
  created_at: string;
  updated_at: string;
}

function mapRow(row: CommissionRow): Commission {
  return {
    id: row.id,
    itineraryId: row.itinerary_id,
    supplierId: row.supplier_id,
    expectedAmount: row.expected_amount,
    actualReceived: row.actual_received ?? undefined,
    receivedDate: row.received_date ?? undefined,
    dueDate: row.due_date,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class PostgresCommissionRepository implements CommissionRepository {
  async list(): Promise<Commission[]> {
    const sql = 'select * from commissions order by created_at desc';
    const result = await pgQuery<CommissionRow>(sql);
    return result.rows.map(mapRow);
  }

  async getById(id: string): Promise<Commission | null> {
    const sql = 'select * from commissions where id = $1';
    const result = await pgQuery<CommissionRow>(sql, [id]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async create(entity: Commission): Promise<Commission> {
    const sql = `
      insert into commissions (
        id, itinerary_id, supplier_id, expected_amount, actual_received,
        received_date, due_date, status, created_at, updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
      ) returning *
    `;

    const params = [
      entity.id,
      entity.itineraryId,
      entity.supplierId,
      entity.expectedAmount,
      entity.actualReceived ?? null,
      entity.receivedDate ?? null,
      entity.dueDate,
      entity.status,
      entity.createdAt,
      entity.updatedAt
    ];

    const result = await pgQuery<CommissionRow>(sql, params);
    return mapRow(result.rows[0]);
  }

  async update(entity: Commission): Promise<Commission> {
    const sql = `
      update commissions set
        expected_amount = $2,
        actual_received = $3,
        received_date = $4,
        due_date = $5,
        status = $6,
        updated_at = $7
      where id = $1
      returning *
    `;

    const params = [
      entity.id,
      entity.expectedAmount,
      entity.actualReceived ?? null,
      entity.receivedDate ?? null,
      entity.dueDate,
      entity.status,
      entity.updatedAt
    ];

    const result = await pgQuery<CommissionRow>(sql, params);
    return mapRow(result.rows[0]);
  }
}
