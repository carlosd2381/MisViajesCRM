import { pgQuery } from '../../../core/db/pg-client';
import type { Supplier } from '../domain/supplier';
import type { SupplierRepository } from '../domain/supplier-repository';

interface SupplierRow {
  id: string;
  name: string;
  trade_name: string | null;
  type: Supplier['type'];
  service_model: Supplier['serviceModel'] | null;
  market_focus_tags: string[];
  tier_level: Supplier['tierLevel'] | null;
  rfc: string | null;
  billing_address: string | null;
  status: Supplier['status'];
  default_currency: Supplier['defaultCurrency'];
  commission_type: Supplier['commissionType'];
  commission_rate: number;
  payout_terms: Supplier['payoutTerms'];
  contract_expiry_date: string | null;
  blackout_dates: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  internal_rating: number | null;
  response_time_score: number | null;
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
    serviceModel: row.service_model ?? undefined,
    marketFocusTags: row.market_focus_tags ?? [],
    tierLevel: row.tier_level ?? undefined,
    rfc: row.rfc ?? undefined,
    billingAddress: row.billing_address ?? undefined,
    status: row.status,
    defaultCurrency: row.default_currency,
    commissionType: row.commission_type,
    commissionRate: row.commission_rate,
    payoutTerms: row.payout_terms,
    contractExpiryDate: row.contract_expiry_date ?? undefined,
    blackoutDates: row.blackout_dates ?? undefined,
    emergencyContactName: row.emergency_contact_name ?? undefined,
    emergencyContactPhone: row.emergency_contact_phone ?? undefined,
    internalRating: row.internal_rating ?? undefined,
    responseTimeScore: row.response_time_score ?? undefined,
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
        id, name, trade_name, type, service_model, market_focus_tags, tier_level,
        rfc, billing_address, status, default_currency, commission_type,
        commission_rate, payout_terms, contract_expiry_date, blackout_dates,
        emergency_contact_name, emergency_contact_phone, internal_rating,
        response_time_score, internal_risk_flag, created_at, updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
      ) returning *
    `;

    const params = [
      entity.id,
      entity.name,
      entity.tradeName ?? null,
      entity.type,
      entity.serviceModel ?? null,
      entity.marketFocusTags ?? [],
      entity.tierLevel ?? null,
      entity.rfc ?? null,
      entity.billingAddress ?? null,
      entity.status,
      entity.defaultCurrency,
      entity.commissionType,
      entity.commissionRate,
      entity.payoutTerms,
      entity.contractExpiryDate ?? null,
      entity.blackoutDates ?? null,
      entity.emergencyContactName ?? null,
      entity.emergencyContactPhone ?? null,
      entity.internalRating ?? null,
      entity.responseTimeScore ?? null,
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
        service_model = $5,
        market_focus_tags = $6,
        tier_level = $7,
        rfc = $8,
        billing_address = $9,
        status = $10,
        default_currency = $11,
        commission_type = $12,
        commission_rate = $13,
        payout_terms = $14,
        contract_expiry_date = $15,
        blackout_dates = $16,
        emergency_contact_name = $17,
        emergency_contact_phone = $18,
        internal_rating = $19,
        response_time_score = $20,
        internal_risk_flag = $21,
        updated_at = $22
      where id = $1
      returning *
    `;

    const params = [
      entity.id,
      entity.name,
      entity.tradeName ?? null,
      entity.type,
      entity.serviceModel ?? null,
      entity.marketFocusTags ?? [],
      entity.tierLevel ?? null,
      entity.rfc ?? null,
      entity.billingAddress ?? null,
      entity.status,
      entity.defaultCurrency,
      entity.commissionType,
      entity.commissionRate,
      entity.payoutTerms,
      entity.contractExpiryDate ?? null,
      entity.blackoutDates ?? null,
      entity.emergencyContactName ?? null,
      entity.emergencyContactPhone ?? null,
      entity.internalRating ?? null,
      entity.responseTimeScore ?? null,
      entity.internalRiskFlag,
      entity.updatedAt
    ];

    const result = await pgQuery<SupplierRow>(sql, params);
    return mapRow(result.rows[0]);
  }

  async delete(id: string, options?: { cascade?: boolean }): Promise<void> {
    if (!options?.cascade) {
      await pgQuery('delete from suppliers where id = $1', [id]);
      return;
    }

    await pgQuery('delete from itinerary_commission_splits where supplier_id = $1', [id]);
    await pgQuery('delete from commissions where supplier_id = $1', [id]);
    await pgQuery('delete from suppliers where id = $1', [id]);
  }
}
