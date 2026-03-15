import { failure, success, type ValidationResult } from '../../../core/validation/validation-types';
import type {
  CreateItineraryDayActivityRequest,
  CreateItineraryDayRequest,
  CreateItineraryItemRequest,
  CreateItineraryRequest,
  PortalApproveProposalRequest,
  PortalRequestRevisionRequest,
  PipelineMoveRequest,
  PublishProposalRequest,
  UpdateItineraryDayActivityRequest,
  UpdateItineraryDayRequest,
  UpdateItineraryRequest
} from './itinerary-contracts';
import { ITINERARY_STATUS } from '../domain/itinerary';
import { ITINERARY_ITEM_CATEGORY } from '../domain/itinerary-item';
import { ITINERARY_DAY_ACTIVITY_CATEGORY } from '../domain/itinerary-day-activity';
import { DESTINATION_LIBRARY_CATEGORY, type DestinationLibraryCategory } from '../domain/destination-library-entry';

type UnknownRecord = Record<string, unknown>;

const SUPPORTED_CURRENCIES = ['MXN', 'USD', 'EUR'] as const;

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  return value;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value !== 'boolean') return undefined;
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

function parseDayActivityCategory(value: unknown): (typeof ITINERARY_DAY_ACTIVITY_CATEGORY)[number] | undefined {
  const text = asText(value);
  if (!text) return undefined;
  if (!ITINERARY_DAY_ACTIVITY_CATEGORY.includes(text as (typeof ITINERARY_DAY_ACTIVITY_CATEGORY)[number])) return undefined;
  return text as (typeof ITINERARY_DAY_ACTIVITY_CATEGORY)[number];
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

export function validatePipelineMove(payload: UnknownRecord): ValidationResult<PipelineMoveRequest> {
  const toStatus = parseStatus(payload.toStatus);
  const notes = asText(payload.notes);

  const errors: string[] = [];
  if (!toStatus) errors.push('toStatus inválido');

  if (errors.length > 0) return failure(errors);

  return success({
    toStatus: toStatus as PipelineMoveRequest['toStatus'],
    notes
  });
}

export function validateCreateItineraryDay(payload: UnknownRecord): ValidationResult<CreateItineraryDayRequest> {
  const dayIndex = asNumber(payload.dayIndex);
  const title = asText(payload.title);
  const dayDate = asText(payload.dayDate);
  const summary = asText(payload.summary);

  const errors: string[] = [];
  if (dayIndex === undefined || dayIndex < 1) errors.push('dayIndex debe ser mayor o igual a 1');
  if (!title) errors.push('title es requerido');

  if (errors.length > 0) return failure(errors);

  return success({
    dayIndex: dayIndex as number,
    dayDate,
    title: title as string,
    summary
  });
}

export function validateUpdateItineraryDay(payload: UnknownRecord): ValidationResult<UpdateItineraryDayRequest> {
  const dayIndex = asNumber(payload.dayIndex);

  if (dayIndex !== undefined && dayIndex < 1) {
    return failure(['dayIndex debe ser mayor o igual a 1']);
  }

  const data: UpdateItineraryDayRequest = {
    dayIndex,
    dayDate: asText(payload.dayDate),
    title: asText(payload.title),
    summary: asText(payload.summary)
  };

  return success(data);
}

export function validateCreateItineraryDayActivity(
  payload: UnknownRecord
): ValidationResult<CreateItineraryDayActivityRequest> {
  const activityIndex = asNumber(payload.activityIndex);
  const title = asText(payload.title);
  const category = parseDayActivityCategory(payload.category);
  const descriptionEs = asText(payload.descriptionEs);
  const descriptionEn = asText(payload.descriptionEn);
  const startsAtLocal = asText(payload.startsAtLocal);
  const durationMinutes = asNumber(payload.durationMinutes);
  const priceNet = asNumber(payload.priceNet);
  const priceGross = asNumber(payload.priceGross);
  const optionalEnabled = asBoolean(payload.optionalEnabled);
  const mediaUrl = asText(payload.mediaUrl);
  const latitude = asNumber(payload.latitude);
  const longitude = asNumber(payload.longitude);

  const errors: string[] = [];
  if (activityIndex === undefined || activityIndex < 1) errors.push('activityIndex debe ser mayor o igual a 1');
  if (!title) errors.push('title es requerido');
  if (!category) errors.push('category inválido');
  if (priceNet === undefined || priceNet < 0) errors.push('priceNet inválido');
  if (priceGross === undefined || priceGross < 0) errors.push('priceGross inválido');
  if (durationMinutes !== undefined && durationMinutes < 0) errors.push('durationMinutes inválido');

  if (errors.length > 0) return failure(errors);

  return success({
    activityIndex: activityIndex as number,
    title: title as string,
    category: category as CreateItineraryDayActivityRequest['category'],
    descriptionEs,
    descriptionEn,
    startsAtLocal,
    durationMinutes,
    priceNet: priceNet as number,
    priceGross: priceGross as number,
    optionalEnabled,
    mediaUrl,
    latitude,
    longitude
  });
}

export function validateUpdateItineraryDayActivity(
  payload: UnknownRecord
): ValidationResult<UpdateItineraryDayActivityRequest> {
  const activityIndex = asNumber(payload.activityIndex);
  const durationMinutes = asNumber(payload.durationMinutes);
  const priceNet = asNumber(payload.priceNet);
  const priceGross = asNumber(payload.priceGross);

  const errors: string[] = [];
  if (activityIndex !== undefined && activityIndex < 1) errors.push('activityIndex debe ser mayor o igual a 1');
  if (durationMinutes !== undefined && durationMinutes < 0) errors.push('durationMinutes inválido');
  if (priceNet !== undefined && priceNet < 0) errors.push('priceNet inválido');
  if (priceGross !== undefined && priceGross < 0) errors.push('priceGross inválido');

  const category = payload.category === undefined
    ? undefined
    : parseDayActivityCategory(payload.category);
  if (payload.category !== undefined && !category) errors.push('category inválido');

  if (errors.length > 0) return failure(errors);

  const data: UpdateItineraryDayActivityRequest = {
    activityIndex,
    title: asText(payload.title),
    category,
    descriptionEs: asText(payload.descriptionEs),
    descriptionEn: asText(payload.descriptionEn),
    startsAtLocal: asText(payload.startsAtLocal),
    durationMinutes,
    priceNet,
    priceGross,
    optionalEnabled: asBoolean(payload.optionalEnabled),
    mediaUrl: asText(payload.mediaUrl),
    latitude: asNumber(payload.latitude),
    longitude: asNumber(payload.longitude)
  };

  return success(data);
}

export interface DestinationLibraryQueryValue {
  location?: string;
  category?: DestinationLibraryCategory;
  limit: number;
}

export function validateDestinationLibraryQuery(searchParams: URLSearchParams): ValidationResult<DestinationLibraryQueryValue> {
  const location = asText(searchParams.get('location'));
  const categoryRaw = asText(searchParams.get('category'));
  const limitRaw = asText(searchParams.get('limit'));

  const errors: string[] = [];

  let category: DestinationLibraryCategory | undefined;
  if (categoryRaw) {
    if (!DESTINATION_LIBRARY_CATEGORY.includes(categoryRaw as DestinationLibraryCategory)) {
      errors.push('category inválido');
    } else {
      category = categoryRaw as DestinationLibraryCategory;
    }
  }

  let limit = 20;
  if (limitRaw) {
    const parsedLimit = Number.parseInt(limitRaw, 10);
    if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      errors.push('limit inválido');
    } else {
      limit = parsedLimit;
    }
  }

  if (errors.length > 0) return failure(errors);

  return success({
    location,
    category,
    limit
  });
}

export function validatePublishProposal(payload: UnknownRecord): ValidationResult<PublishProposalRequest> {
  return success({
    expiresAt: asText(payload.expiresAt)
  });
}

export function validatePortalApproveProposal(
  payload: UnknownRecord
): ValidationResult<PortalApproveProposalRequest> {
  return success({
    message: asText(payload.message)
  });
}

export function validatePortalRequestRevision(
  payload: UnknownRecord
): ValidationResult<PortalRequestRevisionRequest> {
  const feedback = asText(payload.feedback);
  if (!feedback) {
    return failure(['feedback es requerido']);
  }

  return success({ feedback });
}
