import { pgQuery } from '../../../core/db/pg-client';
import type { Itinerary } from '../domain/itinerary';
import type { ItineraryItem } from '../domain/itinerary-item';
import type { ItineraryRepository } from '../domain/itinerary-repository';

interface ItineraryRow {
  id: string;
  client_id: string;
  agent_id: string;
  title: string;
  status: Itinerary['status'];
  start_date: string | null;
  end_date: string | null;
  currency: Itinerary['currency'];
  gross_total: number;
  net_total: number;
  markup_amount: number;
  service_fee_amount: number;
  agency_profit: number;
  ai_narrative_intro: string | null;
  created_at: string;
  updated_at: string;
}

interface ItineraryItemRow {
  id: string;
  itinerary_id: string;
  title: string;
  category: ItineraryItem['category'];
  quantity: number;
  unit_net: number;
  unit_gross: number;
  total_net: number;
  total_gross: number;
  service_fee_amount: number;
  created_at: string;
  updated_at: string;
}

function mapRow(row: ItineraryRow): Itinerary {
  return {
    id: row.id,
    clientId: row.client_id,
    agentId: row.agent_id,
    title: row.title,
    status: row.status,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    currency: row.currency,
    grossTotal: row.gross_total,
    netTotal: row.net_total,
    markupAmount: row.markup_amount,
    serviceFeeAmount: row.service_fee_amount,
    agencyProfit: row.agency_profit,
    aiNarrativeIntro: row.ai_narrative_intro ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapItemRow(row: ItineraryItemRow): ItineraryItem {
  return {
    id: row.id,
    itineraryId: row.itinerary_id,
    title: row.title,
    category: row.category,
    quantity: row.quantity,
    unitNet: row.unit_net,
    unitGross: row.unit_gross,
    totalNet: row.total_net,
    totalGross: row.total_gross,
    serviceFeeAmount: row.service_fee_amount,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class PostgresItineraryRepository implements ItineraryRepository {
  async list(): Promise<Itinerary[]> {
    const sql = 'select * from itineraries order by created_at desc';
    const result = await pgQuery<ItineraryRow>(sql);
    return result.rows.map(mapRow);
  }

  async getById(id: string): Promise<Itinerary | null> {
    const sql = 'select * from itineraries where id = $1';
    const result = await pgQuery<ItineraryRow>(sql, [id]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async create(entity: Itinerary): Promise<Itinerary> {
    const sql = `
      insert into itineraries (
        id, client_id, agent_id, title, status, start_date, end_date,
        currency, gross_total, net_total, markup_amount, service_fee_amount,
        agency_profit, ai_narrative_intro, created_at, updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
      ) returning *
    `;

    const params = [
      entity.id,
      entity.clientId,
      entity.agentId,
      entity.title,
      entity.status,
      entity.startDate ?? null,
      entity.endDate ?? null,
      entity.currency,
      entity.grossTotal,
      entity.netTotal,
      entity.markupAmount,
      entity.serviceFeeAmount,
      entity.agencyProfit,
      entity.aiNarrativeIntro ?? null,
      entity.createdAt,
      entity.updatedAt
    ];

    const result = await pgQuery<ItineraryRow>(sql, params);
    return mapRow(result.rows[0]);
  }

  async update(entity: Itinerary): Promise<Itinerary> {
    const sql = `
      update itineraries set
        client_id = $2,
        agent_id = $3,
        title = $4,
        status = $5,
        start_date = $6,
        end_date = $7,
        currency = $8,
        gross_total = $9,
        net_total = $10,
        markup_amount = $11,
        service_fee_amount = $12,
        agency_profit = $13,
        ai_narrative_intro = $14,
        updated_at = $15
      where id = $1
      returning *
    `;

    const params = [
      entity.id,
      entity.clientId,
      entity.agentId,
      entity.title,
      entity.status,
      entity.startDate ?? null,
      entity.endDate ?? null,
      entity.currency,
      entity.grossTotal,
      entity.netTotal,
      entity.markupAmount,
      entity.serviceFeeAmount,
      entity.agencyProfit,
      entity.aiNarrativeIntro ?? null,
      entity.updatedAt
    ];

    const result = await pgQuery<ItineraryRow>(sql, params);
    return mapRow(result.rows[0]);
  }

  async listItems(itineraryId: string): Promise<ItineraryItem[]> {
    const sql = 'select * from itinerary_items where itinerary_id = $1 order by created_at asc';
    const result = await pgQuery<ItineraryItemRow>(sql, [itineraryId]);
    return result.rows.map(mapItemRow);
  }

  async createItem(item: ItineraryItem): Promise<ItineraryItem> {
    const sql = `
      insert into itinerary_items (
        id, itinerary_id, title, category, quantity,
        unit_net, unit_gross, total_net, total_gross,
        service_fee_amount, created_at, updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      ) returning *
    `;

    const params = [
      item.id,
      item.itineraryId,
      item.title,
      item.category,
      item.quantity,
      item.unitNet,
      item.unitGross,
      item.totalNet,
      item.totalGross,
      item.serviceFeeAmount,
      item.createdAt,
      item.updatedAt
    ];

    const result = await pgQuery<ItineraryItemRow>(sql, params);
    return mapItemRow(result.rows[0]);
  }
}
