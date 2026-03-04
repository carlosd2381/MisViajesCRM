import type {
  CreateItineraryItemRequest,
  CreateItineraryRequest,
  UpdateItineraryRequest
} from '../api/itinerary-contracts';
import type { Itinerary } from '../domain/itinerary';
import type { ItineraryItem } from '../domain/itinerary-item';

function nowIsoDate(): string {
  return new Date().toISOString();
}

function createEntityId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

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
