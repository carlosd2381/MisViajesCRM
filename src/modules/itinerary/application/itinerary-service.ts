import type {
  CreateItineraryDayActivityRequest,
  CreateItineraryDayRequest,
  CreateItineraryItemRequest,
  CreateItineraryRequest,
  PipelineMoveRequest,
  UpdateItineraryDayActivityRequest,
  UpdateItineraryDayRequest,
  UpdateItineraryRequest
} from '../api/itinerary-contracts';
import type { Itinerary } from '../domain/itinerary';
import type { ItineraryItem } from '../domain/itinerary-item';
import type { ItineraryStatusEvent } from '../domain/itinerary-status-event';
import type { ItineraryDay } from '../domain/itinerary-day';
import type { ItineraryDayActivity } from '../domain/itinerary-day-activity';

function nowIsoDate(): string {
  return new Date().toISOString();
}

function createEntityId(prefix: string): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const ALLOWED_PIPELINE_TRANSITIONS: Record<Itinerary['status'], Itinerary['status'][]> = {
  draft: ['sent'],
  sent: ['revised', 'accepted'],
  revised: ['sent', 'accepted'],
  accepted: [],
  paid: [],
  completed: [],
  cancelled: []
};

function computeMarkup(grossTotal: number, netTotal: number): number {
  return grossTotal - netTotal;
}

function computeAgencyProfit(markupAmount: number, serviceFeeAmount: number): number {
  return markupAmount + serviceFeeAmount;
}

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

export function mapCreateItineraryToEntity(input: CreateItineraryRequest): Itinerary {
  const timestamp = nowIsoDate();
  const status = input.status ?? 'draft';
  const serviceFeeAmount = input.serviceFeeAmount ?? 0;
  const markupAmount = computeMarkup(input.grossTotal, input.netTotal);

  return {
    id: createEntityId('itinerary'),
    clientId: input.clientId,
    agentId: input.agentId,
    title: input.title,
    status,
    startDate: input.startDate,
    endDate: input.endDate,
    currency: input.currency,
    grossTotal: input.grossTotal,
    netTotal: input.netTotal,
    markupAmount,
    serviceFeeAmount,
    agencyProfit: computeAgencyProfit(markupAmount, serviceFeeAmount),
    aiNarrativeIntro: input.aiNarrativeIntro,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function mapUpdateItineraryToEntity(current: Itinerary, input: UpdateItineraryRequest): Itinerary {
  const grossTotal = input.grossTotal ?? current.grossTotal;
  const netTotal = input.netTotal ?? current.netTotal;
  const serviceFeeAmount = input.serviceFeeAmount ?? current.serviceFeeAmount;
  const markupAmount = computeMarkup(grossTotal, netTotal);

  return {
    ...current,
    ...input,
    grossTotal,
    netTotal,
    serviceFeeAmount,
    markupAmount,
    agencyProfit: computeAgencyProfit(markupAmount, serviceFeeAmount),
    updatedAt: nowIsoDate()
  };
}

export function mapCreateItineraryItemToEntity(
  itineraryId: string,
  input: CreateItineraryItemRequest
): ItineraryItem {
  const timestamp = nowIsoDate();
  const quantity = input.quantity;
  const totalNet = quantity * input.unitNet;
  const totalGross = quantity * input.unitGross;

  return {
    id: createEntityId('it_item'),
    itineraryId,
    title: input.title,
    category: input.category,
    quantity,
    unitNet: input.unitNet,
    unitGross: input.unitGross,
    totalNet,
    totalGross,
    serviceFeeAmount: input.serviceFeeAmount ?? 0,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function recalculateItineraryTotals(current: Itinerary, items: ItineraryItem[]): Itinerary {
  const grossTotal = sum(items.map((item) => item.totalGross));
  const netTotal = sum(items.map((item) => item.totalNet));
  const serviceFeeAmount = sum(items.map((item) => item.serviceFeeAmount));

  return mapUpdateItineraryToEntity(current, {
    grossTotal,
    netTotal,
    serviceFeeAmount
  });
}

export function isValidPipelineTransition(from: Itinerary['status'], to: Itinerary['status']): boolean {
  if (from === to) return false;
  return ALLOWED_PIPELINE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function mapPipelineMoveToStatusEvent(
  itinerary: Itinerary,
  move: PipelineMoveRequest,
  actorUserId: string | null
): ItineraryStatusEvent {
  return {
    id: createEntityId('it_status_evt'),
    itineraryId: itinerary.id,
    fromStatus: itinerary.status,
    toStatus: move.toStatus,
    changedBy: actorUserId ?? undefined,
    changedAt: nowIsoDate(),
    notes: move.notes?.trim() || undefined
  };
}

export function mapCreateItineraryDayToEntity(
  itineraryId: string,
  input: CreateItineraryDayRequest
): ItineraryDay {
  const timestamp = nowIsoDate();

  return {
    id: createEntityId('it_day'),
    itineraryId,
    dayIndex: input.dayIndex,
    dayDate: input.dayDate,
    title: input.title,
    summary: input.summary,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function mapUpdateItineraryDayToEntity(current: ItineraryDay, input: UpdateItineraryDayRequest): ItineraryDay {
  return {
    ...current,
    ...input,
    updatedAt: nowIsoDate()
  };
}

export function mapCreateItineraryDayActivityToEntity(
  itineraryId: string,
  itineraryDayId: string,
  input: CreateItineraryDayActivityRequest
): ItineraryDayActivity {
  const timestamp = nowIsoDate();

  return {
    id: createEntityId('it_day_act'),
    itineraryId,
    itineraryDayId,
    activityIndex: input.activityIndex,
    title: input.title,
    category: input.category,
    descriptionEs: input.descriptionEs,
    descriptionEn: input.descriptionEn,
    startsAtLocal: input.startsAtLocal,
    durationMinutes: input.durationMinutes,
    priceNet: input.priceNet,
    priceGross: input.priceGross,
    optionalEnabled: Boolean(input.optionalEnabled),
    mediaUrl: input.mediaUrl,
    latitude: input.latitude,
    longitude: input.longitude,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function mapUpdateItineraryDayActivityToEntity(
  current: ItineraryDayActivity,
  input: UpdateItineraryDayActivityRequest
): ItineraryDayActivity {
  return {
    ...current,
    ...input,
    updatedAt: nowIsoDate()
  };
}

export function recalculateItineraryTotalsFromDayActivities(
  current: Itinerary,
  activities: ItineraryDayActivity[]
): Itinerary {
  const enabledActivities = activities.filter((activity) => activity.optionalEnabled);
  const grossTotal = sum(enabledActivities.map((activity) => activity.priceGross));
  const netTotal = sum(enabledActivities.map((activity) => activity.priceNet));

  return mapUpdateItineraryToEntity(current, {
    grossTotal,
    netTotal,
    serviceFeeAmount: 0
  });
}
