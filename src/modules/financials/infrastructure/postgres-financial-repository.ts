import { pgQuery } from '../../../core/db/pg-client';
import type { FinancialRepository } from '../domain/financial-repository';
import type { FinancialTransaction } from '../domain/financial-transaction';

interface FinancialRow {
  id: string;
  itinerary_id: string;
  type: FinancialTransaction['type'];
  amount_original: number;
  currency_original: FinancialTransaction['currencyOriginal'];
  exchange_rate: number;
  amount_mxn: number;
  status: FinancialTransaction['status'];
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: FinancialRow): FinancialTransaction {
  return {
    id: row.id,
    itineraryId: row.itinerary_id,
    type: row.type,
    amountOriginal: row.amount_original,
    currencyOriginal: row.currency_original,
    exchangeRate: row.exchange_rate,
    amountMxn: row.amount_mxn,
    status: row.status,
    transactionDate: row.transaction_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class PostgresFinancialRepository implements FinancialRepository {
  async list(): Promise<FinancialTransaction[]> {
    const sql = 'select * from financial_transactions order by created_at desc';
    const result = await pgQuery<FinancialRow>(sql);
    return result.rows.map(mapRow);
  }

  async getById(id: string): Promise<FinancialTransaction | null> {
    const sql = 'select * from financial_transactions where id = $1';
    const result = await pgQuery<FinancialRow>(sql, [id]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async create(entity: FinancialTransaction): Promise<FinancialTransaction> {
    const sql = `
      insert into financial_transactions (
        id, itinerary_id, type, amount_original, currency_original,
        exchange_rate, amount_mxn, status, transaction_date,
        created_at, updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
      ) returning *
    `;

    const params = [
      entity.id,
      entity.itineraryId,
      entity.type,
      entity.amountOriginal,
      entity.currencyOriginal,
      entity.exchangeRate,
      entity.amountMxn,
      entity.status,
      entity.transactionDate,
      entity.createdAt,
      entity.updatedAt
    ];

    const result = await pgQuery<FinancialRow>(sql, params);
    return mapRow(result.rows[0]);
  }

  async update(entity: FinancialTransaction): Promise<FinancialTransaction> {
    const sql = `
      update financial_transactions set
        type = $2,
        amount_original = $3,
        currency_original = $4,
        exchange_rate = $5,
        amount_mxn = $6,
        status = $7,
        transaction_date = $8,
        updated_at = $9
      where id = $1
      returning *
    `;

    const params = [
      entity.id,
      entity.type,
      entity.amountOriginal,
      entity.currencyOriginal,
      entity.exchangeRate,
      entity.amountMxn,
      entity.status,
      entity.transactionDate,
      entity.updatedAt
    ];

    const result = await pgQuery<FinancialRow>(sql, params);
    return mapRow(result.rows[0]);
  }
}
