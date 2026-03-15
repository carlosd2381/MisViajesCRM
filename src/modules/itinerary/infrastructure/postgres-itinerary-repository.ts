import { pgQuery } from '../../../core/db/pg-client';
import type { Itinerary } from '../domain/itinerary';
import type { ItineraryItem } from '../domain/itinerary-item';
import type { ItineraryRepository } from '../domain/itinerary-repository';
import type { ItineraryStatusEvent } from '../domain/itinerary-status-event';
import type { ItineraryDay } from '../domain/itinerary-day';
import type { ItineraryDayActivity } from '../domain/itinerary-day-activity';
import type { DestinationLibraryEntry, DestinationLibrarySearchQuery } from '../domain/destination-library-entry';
import type { ProposalPublication } from '../domain/proposal-publication';
import type { ProposalActionEvent } from '../domain/proposal-action-event';

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

interface ItineraryStatusEventRow {
  id: string;
  itinerary_id: string;
  from_status: ItineraryStatusEvent['fromStatus'] | null;
  to_status: ItineraryStatusEvent['toStatus'];
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
}

interface ItineraryDayRow {
  id: string;
  itinerary_id: string;
  day_index: number;
  day_date: string | null;
  title: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

interface ItineraryDayActivityRow {
  id: string;
  itinerary_id: string;
  itinerary_day_id: string;
  activity_index: number;
  title: string;
  category: ItineraryDayActivity['category'];
  description_es: string | null;
  description_en: string | null;
  starts_at_local: string | null;
  duration_minutes: number | null;
  price_net: number;
  price_gross: number;
  optional_enabled: boolean;
  media_url: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

interface DestinationLibraryRow {
  id: string;
  location_name: string;
  category: DestinationLibraryEntry['category'];
  title: string;
  custom_description_es: string | null;
  custom_description_en: string | null;
  high_res_media_url: string | null;
  latitude: number | null;
  longitude: number | null;
  tags: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProposalPublicationRow {
  id: string;
  itinerary_id: string;
  hash: string;
  status: ProposalPublication['status'];
  published_by: string | null;
  published_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  last_viewed_at: string | null;
}

interface ProposalActionEventRow {
  id: string;
  proposal_publication_id: string;
  itinerary_id: string;
  action: ProposalActionEvent['action'];
  actor_type: ProposalActionEvent['actorType'];
  actor_ref: string | null;
  message: string | null;
  created_at: string;
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

function mapStatusEventRow(row: ItineraryStatusEventRow): ItineraryStatusEvent {
  return {
    id: row.id,
    itineraryId: row.itinerary_id,
    fromStatus: row.from_status ?? undefined,
    toStatus: row.to_status,
    changedBy: row.changed_by ?? undefined,
    changedAt: row.changed_at,
    notes: row.notes ?? undefined
  };
}

function mapDayRow(row: ItineraryDayRow): ItineraryDay {
  return {
    id: row.id,
    itineraryId: row.itinerary_id,
    dayIndex: row.day_index,
    dayDate: row.day_date ?? undefined,
    title: row.title,
    summary: row.summary ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapDayActivityRow(row: ItineraryDayActivityRow): ItineraryDayActivity {
  return {
    id: row.id,
    itineraryId: row.itinerary_id,
    itineraryDayId: row.itinerary_day_id,
    activityIndex: row.activity_index,
    title: row.title,
    category: row.category,
    descriptionEs: row.description_es ?? undefined,
    descriptionEn: row.description_en ?? undefined,
    startsAtLocal: row.starts_at_local ?? undefined,
    durationMinutes: row.duration_minutes ?? undefined,
    priceNet: row.price_net,
    priceGross: row.price_gross,
    optionalEnabled: row.optional_enabled,
    mediaUrl: row.media_url ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapDestinationLibraryRow(row: DestinationLibraryRow): DestinationLibraryEntry {
  return {
    id: row.id,
    locationName: row.location_name,
    category: row.category,
    title: row.title,
    customDescriptionEs: row.custom_description_es ?? undefined,
    customDescriptionEn: row.custom_description_en ?? undefined,
    highResMediaUrl: row.high_res_media_url ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    tags: row.tags ?? [],
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapProposalPublicationRow(row: ProposalPublicationRow): ProposalPublication {
  return {
    id: row.id,
    itineraryId: row.itinerary_id,
    hash: row.hash,
    status: row.status,
    publishedBy: row.published_by ?? undefined,
    publishedAt: row.published_at,
    expiresAt: row.expires_at ?? undefined,
    revokedAt: row.revoked_at ?? undefined,
    lastViewedAt: row.last_viewed_at ?? undefined
  };
}

function mapProposalActionEventRow(row: ProposalActionEventRow): ProposalActionEvent {
  return {
    id: row.id,
    proposalPublicationId: row.proposal_publication_id,
    itineraryId: row.itinerary_id,
    action: row.action,
    actorType: row.actor_type,
    actorRef: row.actor_ref ?? undefined,
    message: row.message ?? undefined,
    createdAt: row.created_at
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

  async listStatusEvents(itineraryId: string): Promise<ItineraryStatusEvent[]> {
    const sql = 'select * from itinerary_status_events where itinerary_id = $1 order by changed_at desc, id desc';
    const result = await pgQuery<ItineraryStatusEventRow>(sql, [itineraryId]);
    return result.rows.map(mapStatusEventRow);
  }

  async createStatusEvent(event: ItineraryStatusEvent): Promise<ItineraryStatusEvent> {
    const sql = `
      insert into itinerary_status_events (
        id, itinerary_id, from_status, to_status, changed_by, changed_at, notes
      ) values (
        $1,$2,$3,$4,$5,$6,$7
      ) returning *
    `;

    const params = [
      event.id,
      event.itineraryId,
      event.fromStatus ?? null,
      event.toStatus,
      event.changedBy ?? null,
      event.changedAt,
      event.notes ?? null
    ];

    const result = await pgQuery<ItineraryStatusEventRow>(sql, params);
    return mapStatusEventRow(result.rows[0]);
  }

  async listDays(itineraryId: string): Promise<ItineraryDay[]> {
    const sql = 'select * from itinerary_days where itinerary_id = $1 order by day_index asc, created_at asc';
    const result = await pgQuery<ItineraryDayRow>(sql, [itineraryId]);
    return result.rows.map(mapDayRow);
  }

  async getDayById(itineraryId: string, dayId: string): Promise<ItineraryDay | null> {
    const sql = 'select * from itinerary_days where itinerary_id = $1 and id = $2';
    const result = await pgQuery<ItineraryDayRow>(sql, [itineraryId, dayId]);
    return result.rows[0] ? mapDayRow(result.rows[0]) : null;
  }

  async createDay(day: ItineraryDay): Promise<ItineraryDay> {
    const sql = `
      insert into itinerary_days (
        id, itinerary_id, day_index, day_date, title, summary, created_at, updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8
      ) returning *
    `;

    const params = [
      day.id,
      day.itineraryId,
      day.dayIndex,
      day.dayDate ?? null,
      day.title,
      day.summary ?? null,
      day.createdAt,
      day.updatedAt
    ];

    const result = await pgQuery<ItineraryDayRow>(sql, params);
    return mapDayRow(result.rows[0]);
  }

  async updateDay(day: ItineraryDay): Promise<ItineraryDay> {
    const sql = `
      update itinerary_days set
        day_index = $3,
        day_date = $4,
        title = $5,
        summary = $6,
        updated_at = $7
      where id = $1 and itinerary_id = $2
      returning *
    `;

    const params = [
      day.id,
      day.itineraryId,
      day.dayIndex,
      day.dayDate ?? null,
      day.title,
      day.summary ?? null,
      day.updatedAt
    ];

    const result = await pgQuery<ItineraryDayRow>(sql, params);
    return mapDayRow(result.rows[0]);
  }

  async listDayActivities(itineraryId: string, dayId: string): Promise<ItineraryDayActivity[]> {
    const sql = `
      select * from itinerary_day_activities
      where itinerary_id = $1 and itinerary_day_id = $2
      order by activity_index asc, created_at asc
    `;
    const result = await pgQuery<ItineraryDayActivityRow>(sql, [itineraryId, dayId]);
    return result.rows.map(mapDayActivityRow);
  }

  async listAllDayActivities(itineraryId: string): Promise<ItineraryDayActivity[]> {
    const sql = 'select * from itinerary_day_activities where itinerary_id = $1 order by activity_index asc, created_at asc';
    const result = await pgQuery<ItineraryDayActivityRow>(sql, [itineraryId]);
    return result.rows.map(mapDayActivityRow);
  }

  async getDayActivityById(itineraryId: string, dayId: string, activityId: string): Promise<ItineraryDayActivity | null> {
    const sql = `
      select * from itinerary_day_activities
      where itinerary_id = $1 and itinerary_day_id = $2 and id = $3
    `;
    const result = await pgQuery<ItineraryDayActivityRow>(sql, [itineraryId, dayId, activityId]);
    return result.rows[0] ? mapDayActivityRow(result.rows[0]) : null;
  }

  async createDayActivity(activity: ItineraryDayActivity): Promise<ItineraryDayActivity> {
    const sql = `
      insert into itinerary_day_activities (
        id, itinerary_id, itinerary_day_id, activity_index, title, category,
        description_es, description_en, starts_at_local, duration_minutes,
        price_net, price_gross, optional_enabled, media_url, latitude, longitude,
        created_at, updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
      ) returning *
    `;

    const params = [
      activity.id,
      activity.itineraryId,
      activity.itineraryDayId,
      activity.activityIndex,
      activity.title,
      activity.category,
      activity.descriptionEs ?? null,
      activity.descriptionEn ?? null,
      activity.startsAtLocal ?? null,
      activity.durationMinutes ?? null,
      activity.priceNet,
      activity.priceGross,
      activity.optionalEnabled,
      activity.mediaUrl ?? null,
      activity.latitude ?? null,
      activity.longitude ?? null,
      activity.createdAt,
      activity.updatedAt
    ];

    const result = await pgQuery<ItineraryDayActivityRow>(sql, params);
    return mapDayActivityRow(result.rows[0]);
  }

  async updateDayActivity(activity: ItineraryDayActivity): Promise<ItineraryDayActivity> {
    const sql = `
      update itinerary_day_activities set
        activity_index = $4,
        title = $5,
        category = $6,
        description_es = $7,
        description_en = $8,
        starts_at_local = $9,
        duration_minutes = $10,
        price_net = $11,
        price_gross = $12,
        optional_enabled = $13,
        media_url = $14,
        latitude = $15,
        longitude = $16,
        updated_at = $17
      where id = $1 and itinerary_id = $2 and itinerary_day_id = $3
      returning *
    `;

    const params = [
      activity.id,
      activity.itineraryId,
      activity.itineraryDayId,
      activity.activityIndex,
      activity.title,
      activity.category,
      activity.descriptionEs ?? null,
      activity.descriptionEn ?? null,
      activity.startsAtLocal ?? null,
      activity.durationMinutes ?? null,
      activity.priceNet,
      activity.priceGross,
      activity.optionalEnabled,
      activity.mediaUrl ?? null,
      activity.latitude ?? null,
      activity.longitude ?? null,
      activity.updatedAt
    ];

    const result = await pgQuery<ItineraryDayActivityRow>(sql, params);
    return mapDayActivityRow(result.rows[0]);
  }

  async searchDestinationLibrary(query: DestinationLibrarySearchQuery): Promise<DestinationLibraryEntry[]> {
    const clauses: string[] = ['is_active = true'];
    const params: Array<string | number> = [];

    if (query.category) {
      params.push(query.category);
      clauses.push(`category = $${params.length}`);
    }

    if (query.location?.trim()) {
      params.push(`%${query.location.trim()}%`);
      const locationParamIndex = params.length;
      clauses.push(`(
        location_name ilike $${locationParamIndex}
        or title ilike $${locationParamIndex}
        or exists (
          select 1 from unnest(tags) as tag
          where tag ilike $${locationParamIndex}
        )
      )`);
    }

    params.push(query.limit);
    const limitParamIndex = params.length;

    const sql = `
      select * from destination_library
      where ${clauses.join(' and ')}
      order by updated_at desc
      limit $${limitParamIndex}
    `;

    const result = await pgQuery<DestinationLibraryRow>(sql, params);
    return result.rows.map(mapDestinationLibraryRow);
  }

  async createProposalPublication(publication: ProposalPublication): Promise<ProposalPublication> {
    const sql = `
      insert into proposal_publications (
        id, itinerary_id, hash, status, published_by, published_at, expires_at, revoked_at, last_viewed_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9
      ) returning *
    `;

    const params = [
      publication.id,
      publication.itineraryId,
      publication.hash,
      publication.status,
      publication.publishedBy ?? null,
      publication.publishedAt,
      publication.expiresAt ?? null,
      publication.revokedAt ?? null,
      publication.lastViewedAt ?? null
    ];

    const result = await pgQuery<ProposalPublicationRow>(sql, params);
    return mapProposalPublicationRow(result.rows[0]);
  }

  async getProposalPublicationByHash(hash: string): Promise<ProposalPublication | null> {
    const sql = 'select * from proposal_publications where hash = $1';
    const result = await pgQuery<ProposalPublicationRow>(sql, [hash]);
    return result.rows[0] ? mapProposalPublicationRow(result.rows[0]) : null;
  }

  async updateProposalPublication(publication: ProposalPublication): Promise<ProposalPublication> {
    const sql = `
      update proposal_publications set
        status = $2,
        published_by = $3,
        published_at = $4,
        expires_at = $5,
        revoked_at = $6,
        last_viewed_at = $7
      where id = $1
      returning *
    `;

    const params = [
      publication.id,
      publication.status,
      publication.publishedBy ?? null,
      publication.publishedAt,
      publication.expiresAt ?? null,
      publication.revokedAt ?? null,
      publication.lastViewedAt ?? null
    ];

    const result = await pgQuery<ProposalPublicationRow>(sql, params);
    return mapProposalPublicationRow(result.rows[0]);
  }

  async createProposalActionEvent(event: ProposalActionEvent): Promise<ProposalActionEvent> {
    const sql = `
      insert into proposal_action_events (
        id, proposal_publication_id, itinerary_id, action, actor_type, actor_ref, message, created_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8
      ) returning *
    `;

    const params = [
      event.id,
      event.proposalPublicationId,
      event.itineraryId,
      event.action,
      event.actorType,
      event.actorRef ?? null,
      event.message ?? null,
      event.createdAt
    ];

    const result = await pgQuery<ProposalActionEventRow>(sql, params);
    return mapProposalActionEventRow(result.rows[0]);
  }

  async listProposalActionEvents(proposalPublicationId: string): Promise<ProposalActionEvent[]> {
    const sql = 'select * from proposal_action_events where proposal_publication_id = $1 order by created_at desc, id desc';
    const result = await pgQuery<ProposalActionEventRow>(sql, [proposalPublicationId]);
    return result.rows.map(mapProposalActionEventRow);
  }
}
