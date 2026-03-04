import { failure, success, type ValidationResult } from '../../../core/validation/validation-types';
import type {
  CreateItineraryItemRequest,
  CreateItineraryRequest,
  UpdateItineraryRequest
} from './itinerary-contracts';
import { ITINERARY_STATUS } from '../domain/itinerary';
import { ITINERARY_ITEM_CATEGORY } from '../domain/itinerary-item';

type UnknownRecord = Record<string, unknown>;

const SUPPORTED_CURRENCIES = ['MXN', 'USD', 'EUR'] as const;

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  return value;
}

function isCurrency(value: string): value is (typeof SUPPORTED_CURRENCIES)[number] {
  return SUPPORTED_CURRENCIES.includes(value as (typeof SUPPORTED_CURRENCIES)[number]);
}

function isItineraryStatus(value: string): value is (typeof ITINERARY_STATUS)[number] {
  return ITINERARY_STATUS.includes(value as (typeof ITINERARY_STATUS)[number]);
}

function parseCurrency(value: unknown): 'MXN' | 'USD' | 'EUR' | undefined {
  const text = asText(value);
  if (!text || !isCurrency(text)) return undefined;
  return text;
}

function parseStatus(value: unknown): (typeof ITINERARY_STATUS)[number] | undefined {
  const text = asText(value);
  if (!text || !isItineraryStatus(text)) return undefined;
  return text;
}

function parseItemCategory(value: unknown): (typeof ITINERARY_ITEM_CATEGORY)[number] | undefined {
  const text = asText(value);
  if (!text) return undefined;
  if (!ITINERARY_ITEM_CATEGORY.includes(text as (typeof ITINERARY_ITEM_CATEGORY)[number])) return undefined;
  return text as (typeof ITINERARY_ITEM_CATEGORY)[number];
}

export function validateCreateItinerary(payload: UnknownRecord): ValidationResult<CreateItineraryRequest> {
  const clientId = asText(payload.clientId);
  const agentId = asText(payload.agentId);
  const title = asText(payload.title);
  const currency = parseCurrency(payload.currency);
  const grossTotal = asNumber(payload.grossTotal);
  const netTotal = asNumber(payload.netTotal);

  const errors: string[] = [];
  if (!clientId) errors.push('clientId es requerido');
  if (!agentId) errors.push('agentId es requerido');
  if (!title) errors.push('title es requerido');
  if (!currency) errors.push('currency debe ser MXN, USD o EUR');
  if (grossTotal === undefined) errors.push('grossTotal es requerido');
  if (netTotal === undefined) errors.push('netTotal es requerido');

  if (errors.length > 0) return failure(errors);

  const requiredClientId = clientId as string;
  const requiredAgentId = agentId as string;
  const requiredTitle = title as string;
  const requiredCurrency = currency as 'MXN' | 'USD' | 'EUR';
  const requiredGrossTotal = grossTotal as number;
  const requiredNetTotal = netTotal as number;

  return success({
    clientId: requiredClientId,
    agentId: requiredAgentId,
    title: requiredTitle,
    status: parseStatus(payload.status),
    startDate: asText(payload.startDate),
    endDate: asText(payload.endDate),
    currency: requiredCurrency,
    grossTotal: requiredGrossTotal,
    netTotal: requiredNetTotal,
    serviceFeeAmount: asNumber(payload.serviceFeeAmount),
    aiNarrativeIntro: asText(payload.aiNarrativeIntro)
  });
}

export function validateUpdateItinerary(payload: UnknownRecord): ValidationResult<UpdateItineraryRequest> {
  const data: UpdateItineraryRequest = {
    title: asText(payload.title),
    status: parseStatus(payload.status),
    startDate: asText(payload.startDate),
    endDate: asText(payload.endDate),
    currency: parseCurrency(payload.currency),
    grossTotal: asNumber(payload.grossTotal),
    netTotal: asNumber(payload.netTotal),
    serviceFeeAmount: asNumber(payload.serviceFeeAmount),
    aiNarrativeIntro: asText(payload.aiNarrativeIntro)
  };

  return success(data);
}

export function validateCreateItineraryItem(
  payload: UnknownRecord
): ValidationResult<CreateItineraryItemRequest> {
  const title = asText(payload.title);
  const category = parseItemCategory(payload.category);
  const quantity = asNumber(payload.quantity);
  const unitNet = asNumber(payload.unitNet);
  const unitGross = asNumber(payload.unitGross);
  const serviceFeeAmount = asNumber(payload.serviceFeeAmount);

  const errors: string[] = [];
  if (!title) errors.push('title es requerido');
  if (!category) errors.push('category inválido');
  if (quantity === undefined || quantity <= 0) errors.push('quantity debe ser mayor a 0');
  if (unitNet === undefined || unitNet < 0) errors.push('unitNet inválido');
  if (unitGross === undefined || unitGross < 0) errors.push('unitGross inválido');
  if (serviceFeeAmount !== undefined && serviceFeeAmount < 0) errors.push('serviceFeeAmount inválido');

  if (errors.length > 0) return failure(errors);

  return success({
    title: title as string,
    category: category as (typeof ITINERARY_ITEM_CATEGORY)[number],
    quantity: quantity as number,
    unitNet: unitNet as number,
    unitGross: unitGross as number,
    serviceFeeAmount
  });
}
