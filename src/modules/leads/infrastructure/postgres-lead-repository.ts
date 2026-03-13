import type { LeadRepository } from '../domain/lead-repository';
import type { Lead } from '../domain/lead';
import { pgQuery } from '../../../core/db/pg-client';

interface LeadRow {
  id: string;
  status: Lead['status'];
  source: Lead['source'];
  priority: Lead['priority'];
  first_name: string | null;
  paternal_last_name: string | null;
  email: string | null;
  phone: string | null;
  destination: string;
  travel_start_date: string | null;
  travel_end_date: string | null;
  urgency_timeframe: string | null;
  trip_occasion: string | null;
  campaign_id: string | null;
  referral_name: string | null;
  assigned_agent_name: string | null;
  last_contact_date: string | null;
  probability_of_sale: number | null;
  lead_temperature: string | null;
  date_flexibility: string | null;
  preferred_contact_method: string | null;
  adults_count: number;
  children_count: number;
  budget_min: number | null;
  budget_max: number | null;
  budget_currency: Lead['budgetCurrency'] | null;
  trip_type: string | null;
  preferences: string | null;
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
    firstName: row.first_name ?? undefined,
    paternalLastName: row.paternal_last_name ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    destination: row.destination,
    travelStartDate: row.travel_start_date ?? undefined,
    travelEndDate: row.travel_end_date ?? undefined,
    urgencyTimeframe: row.urgency_timeframe ?? undefined,
    tripOccasion: row.trip_occasion ?? undefined,
    campaignId: row.campaign_id ?? undefined,
    referralName: row.referral_name ?? undefined,
    assignedAgentName: row.assigned_agent_name ?? undefined,
    lastContactDate: row.last_contact_date ?? undefined,
    probabilityOfSale: row.probability_of_sale ?? undefined,
    leadTemperature: row.lead_temperature ?? undefined,
    dateFlexibility: row.date_flexibility ?? undefined,
    preferredContactMethod: row.preferred_contact_method ?? undefined,
    adultsCount: row.adults_count,
    childrenCount: row.children_count,
    budgetMin: row.budget_min ?? undefined,
    budgetMax: row.budget_max ?? undefined,
    budgetCurrency: row.budget_currency ?? undefined,
    tripType: row.trip_type ?? undefined,
    preferences: row.preferences ?? undefined,
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
        id, status, source, priority, first_name, paternal_last_name, email, phone,
        destination, travel_start_date, travel_end_date, urgency_timeframe, trip_occasion,
        campaign_id, referral_name, assigned_agent_name, last_contact_date, probability_of_sale,
        lead_temperature, date_flexibility, preferred_contact_method,
        adults_count, children_count, budget_min, budget_max, budget_currency,
        trip_type, preferences, notes, assigned_agent_id, created_at, updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32
      ) returning *
    `;

    const params = [
      entity.id,
      entity.status,
      entity.source,
      entity.priority,
      entity.firstName ?? null,
      entity.paternalLastName ?? null,
      entity.email ?? null,
      entity.phone ?? null,
      entity.destination,
      entity.travelStartDate ?? null,
      entity.travelEndDate ?? null,
      entity.urgencyTimeframe ?? null,
      entity.tripOccasion ?? null,
      entity.campaignId ?? null,
      entity.referralName ?? null,
      entity.assignedAgentName ?? null,
      entity.lastContactDate ?? null,
      entity.probabilityOfSale ?? null,
      entity.leadTemperature ?? null,
      entity.dateFlexibility ?? null,
      entity.preferredContactMethod ?? null,
      entity.adultsCount,
      entity.childrenCount,
      entity.budgetMin ?? null,
      entity.budgetMax ?? null,
      entity.budgetCurrency ?? null,
      entity.tripType ?? null,
      entity.preferences ?? null,
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
        first_name = $5,
        paternal_last_name = $6,
        email = $7,
        phone = $8,
        destination = $9,
        travel_start_date = $10,
        travel_end_date = $11,
        urgency_timeframe = $12,
        trip_occasion = $13,
        campaign_id = $14,
        referral_name = $15,
        assigned_agent_name = $16,
        last_contact_date = $17,
        probability_of_sale = $18,
        lead_temperature = $19,
        date_flexibility = $20,
        preferred_contact_method = $21,
        adults_count = $22,
        children_count = $23,
        budget_min = $24,
        budget_max = $25,
        budget_currency = $26,
        trip_type = $27,
        preferences = $28,
        notes = $29,
        assigned_agent_id = $30,
        updated_at = $31
      where id = $1
      returning *
    `;

    const params = [
      entity.id,
      entity.status,
      entity.source,
      entity.priority,
      entity.firstName ?? null,
      entity.paternalLastName ?? null,
      entity.email ?? null,
      entity.phone ?? null,
      entity.destination,
      entity.travelStartDate ?? null,
      entity.travelEndDate ?? null,
      entity.urgencyTimeframe ?? null,
      entity.tripOccasion ?? null,
      entity.campaignId ?? null,
      entity.referralName ?? null,
      entity.assignedAgentName ?? null,
      entity.lastContactDate ?? null,
      entity.probabilityOfSale ?? null,
      entity.leadTemperature ?? null,
      entity.dateFlexibility ?? null,
      entity.preferredContactMethod ?? null,
      entity.adultsCount,
      entity.childrenCount,
      entity.budgetMin ?? null,
      entity.budgetMax ?? null,
      entity.budgetCurrency ?? null,
      entity.tripType ?? null,
      entity.preferences ?? null,
      entity.notes ?? null,
      entity.assignedAgentId ?? null,
      entity.updatedAt
    ];

    const result = await pgQuery<LeadRow>(sql, params);
    return mapRow(result.rows[0]);
  }

  async delete(id: string, options?: { cascade?: boolean }): Promise<void> {
    if (!options?.cascade) {
      await pgQuery('delete from leads where id = $1', [id]);
      return;
    }

    const clientRows = await pgQuery<{ id: string }>('select id from clients where lead_id = $1', [id]);
    const clientIds = clientRows.rows.map((row) => row.id);

    if (clientIds.length > 0) {
      const itineraryRows = await pgQuery<{ id: string }>(
        'select id from itineraries where client_id = any($1::text[])',
        [clientIds]
      );
      const itineraryIds = itineraryRows.rows.map((row) => row.id);

      let invoiceIds: string[] = [];
      if (itineraryIds.length > 0) {
        const byItinerary = await pgQuery<{ id: string }>(
          'select id from cfdi_invoices where itinerary_id = any($1::text[])',
          [itineraryIds]
        );
        invoiceIds = [...invoiceIds, ...byItinerary.rows.map((row) => row.id)];

        await pgQuery('delete from itinerary_items where itinerary_id = any($1::text[])', [itineraryIds]);
        await pgQuery('delete from financial_transactions where itinerary_id = any($1::text[])', [itineraryIds]);
        await pgQuery('delete from itinerary_commission_splits where itinerary_id = any($1::text[])', [itineraryIds]);
        await pgQuery('delete from commissions where itinerary_id = any($1::text[])', [itineraryIds]);
      }

      const byClient = await pgQuery<{ id: string }>('select id from cfdi_invoices where client_id = any($1::text[])', [clientIds]);
      invoiceIds = [...invoiceIds, ...byClient.rows.map((row) => row.id)];
      invoiceIds = Array.from(new Set(invoiceIds));

      if (invoiceIds.length > 0) {
        await pgQuery('delete from cfdi_invoice_events where cfdi_invoice_id = any($1::text[])', [invoiceIds]);
        await pgQuery('delete from cfdi_invoices where id = any($1::text[])', [invoiceIds]);
      }

      await pgQuery('delete from communication_logs where client_id = any($1::text[])', [clientIds]);
      await pgQuery('delete from itineraries where client_id = any($1::text[])', [clientIds]);
      await pgQuery('delete from clients where lead_id = $1', [id]);
    }

    await pgQuery('delete from leads where id = $1', [id]);
  }
}
