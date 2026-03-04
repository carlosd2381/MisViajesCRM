import { pgQuery } from '../../../core/db/pg-client';
import type { Supplier } from '../domain/supplier';
import type { SupplierRepository } from '../domain/supplier-repository';

interface SupplierRow {
  id: string;
  name: string;
  trade_name: string | null;
  type: Supplier['type'];
  rfc: string | null;
  status: Supplier['status'];
  default_currency: Supplier['defaultCurrency'];
  commission_type: Supplier['commissionType'];
  commission_rate: number;
  payout_terms: Supplier['payoutTerms'];
  internal_risk_flag: Supplier['internalRiskFlag'];
  created_at: string;
  updated_at: string;
}

function mapRow(row: SupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    tradeName: row.trade_name ?? undefined,
    type: row.type,
    rfc: row.rfc ?? undefined,
    status: row.status,
    defaultCurrency: row.default_currency,
    commissionType: row.commission_type,
    commissionRate: row.commission_rate,
    payoutTerms: row.payout_terms,
    internalRiskFlag: row.internal_risk_flag,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class PostgresSupplierRepository implements SupplierRepository {
  async list(): Promise<Supplier[]> {
    const sql = 'select * from suppliers order by created_at desc';
    const result = await pgQuery<SupplierRow>(sql);
    return result.rows.map(mapRow);
  }

  async getById(id: string): Promise<Supplier | null> {
    const sql = 'select * from suppliers where id = $1';
    const result = await pgQuery<SupplierRow>(sql, [id]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async create(entity: Supplier): Promise<Supplier> {
    const sql = `
      insert into suppliers (
        id, name, trade_name, type, rfc, status, default_currency,
        commission_type, commission_rate, payout_terms, internal_risk_flag,
        created_at, updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
      ) returning *
    `;

    const params = [
      entity.id,
      entity.name,
      entity.tradeName ?? null,
      entity.type,
      entity.rfc ?? null,
      entity.status,
      entity.defaultCurrency,
      entity.commissionType,
      entity.commissionRate,
      entity.payoutTerms,
      entity.internalRiskFlag,
      entity.createdAt,
      entity.updatedAt
    ];

    const result = await pgQuery<SupplierRow>(sql, params);
    return mapRow(result.rows[0]);
  }

  async update(entity: Supplier): Promise<Supplier> {
    const sql = `
      update suppliers set
        name = $2,
        trade_name = $3,
        type = $4,
        rfc = $5,
        status = $6,
        default_currency = $7,
        commission_type = $8,
        commission_rate = $9,
        payout_terms = $10,
        internal_risk_flag = $11,
        updated_at = $12
      where id = $1
      returning *
    `;

    const params = [
      entity.id,
      entity.name,
      entity.tradeName ?? null,
      entity.type,
      entity.rfc ?? null,
      entity.status,
      entity.defaultCurrency,
      entity.commissionType,
      entity.commissionRate,
      entity.payoutTerms,
      entity.internalRiskFlag,
      entity.updatedAt
    ];

    const result = await pgQuery<SupplierRow>(sql, params);
    return mapRow(result.rows[0]);
  }
}
