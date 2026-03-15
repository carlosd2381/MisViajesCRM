import { failure, success, type ValidationResult } from '../../../core/validation/validation-types';
import type {
  AiItineraryGenerateRequest,
  AiLogicValidateRequest,
  AiToneTransformRequest,
  CreateAiProposalRequest
} from './proposal-contracts';
import { AI_TONE_TARGETS } from './proposal-contracts';
import { PROMPT_PROFILE, type PromptProfile } from '../domain/prompt-profile';

type UnknownRecord = Record<string, unknown>;

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

function parseProfile(value: unknown): PromptProfile | undefined {
  const text = asText(value);
  if (!text) return undefined;
  if (!PROMPT_PROFILE.includes(text as PromptProfile)) return undefined;
  return text as PromptProfile;
}

function asRecord(value: unknown): UnknownRecord | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as UnknownRecord;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const values = value
    .map((entry) => asText(entry))
    .filter((entry): entry is string => entry !== undefined);
  if (values.length !== value.length) return undefined;
  return values;
}

export function validateCreateAiProposal(payload: UnknownRecord): ValidationResult<CreateAiProposalRequest> {
  const errors: string[] = [];

  const promptProfile = parseProfile(payload.promptProfile);
  const itinerarySummary = asText(payload.itinerarySummary);
  const destination = asText(payload.destination);
  const days = asNumber(payload.days);
  const enforceQualityGate = asBoolean(payload.enforceQualityGate);
  const renderOptionsPayload = payload.renderOptions;
  let includeWarnings: boolean | undefined;
  let compactMode: boolean | undefined;

  if (renderOptionsPayload !== undefined) {
    const renderOptionsRecord = asRecord(renderOptionsPayload);
    if (!renderOptionsRecord) {
      errors.push('renderOptions inválido');
    } else {
      const parsedIncludeWarnings = asBoolean(renderOptionsRecord.includeWarnings);
      const parsedCompactMode = asBoolean(renderOptionsRecord.compactMode);

      if (renderOptionsRecord.includeWarnings !== undefined && parsedIncludeWarnings === undefined) {
        errors.push('renderOptions.includeWarnings inválido');
      }
      if (renderOptionsRecord.compactMode !== undefined && parsedCompactMode === undefined) {
        errors.push('renderOptions.compactMode inválido');
      }

      includeWarnings = parsedIncludeWarnings;
      compactMode = parsedCompactMode;
    }
  }

  if (!promptProfile) errors.push('promptProfile inválido');
  if (!itinerarySummary) errors.push('itinerarySummary es requerido');
  if (!destination) errors.push('destination es requerido');
  if (days === undefined || days <= 0 || !Number.isInteger(days)) errors.push('days debe ser entero mayor a 0');

  if (errors.length > 0) return failure(errors);

  return success({
    promptProfile: promptProfile as PromptProfile,
    itinerarySummary: itinerarySummary as string,
    destination: destination as string,
    days: days as number,
    enforceQualityGate,
    renderOptions: includeWarnings !== undefined || compactMode !== undefined
      ? { includeWarnings, compactMode }
      : undefined
  });
}

export function validateAiItineraryGenerate(payload: UnknownRecord): ValidationResult<AiItineraryGenerateRequest> {
  const errors: string[] = [];

  const destination = asText(payload.destination);
  const durationDays = asNumber(payload.durationDays);
  const interests = asStringArray(payload.interests);

  let guestProfile: AiItineraryGenerateRequest['guestProfile'];
  if (payload.guestProfile !== undefined) {
    const guestProfileRecord = asRecord(payload.guestProfile);
    if (!guestProfileRecord) {
      errors.push('guestProfile inválido');
    } else {
      const travelerCount = asNumber(guestProfileRecord.travelerCount);
      if (
        guestProfileRecord.travelerCount !== undefined
        && (travelerCount === undefined || !Number.isInteger(travelerCount) || travelerCount <= 0)
      ) {
        errors.push('guestProfile.travelerCount inválido');
      }

      guestProfile = {
        ageGroup: asText(guestProfileRecord.ageGroup),
        mobilityNotes: asText(guestProfileRecord.mobilityNotes),
        travelerCount
      };
    }
  }

  if (!destination) errors.push('destination es requerido');
  if (durationDays === undefined || !Number.isInteger(durationDays) || durationDays <= 0 || durationDays > 30) {
    errors.push('durationDays debe ser entero entre 1 y 30');
  }
  if (!interests || interests.length === 0) errors.push('interests debe incluir al menos un elemento');

  if (errors.length > 0) return failure(errors);

  return success({
    guestProfile,
    durationDays: durationDays as number,
    destination: destination as string,
    interests: interests as string[]
  });
}

export function validateAiToneTransform(payload: UnknownRecord): ValidationResult<AiToneTransformRequest> {
  const errors: string[] = [];

  const sourceText = asText(payload.sourceText);
  const targetTone = asText(payload.targetTone);

  if (!sourceText) errors.push('sourceText es requerido');
  if (!targetTone || !AI_TONE_TARGETS.includes(targetTone as AiToneTransformRequest['targetTone'])) {
    errors.push('targetTone inválido');
  }

  if (errors.length > 0) return failure(errors);

  return success({
    sourceText: sourceText as string,
    targetTone: targetTone as AiToneTransformRequest['targetTone']
  });
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function validateAiLogicValidation(payload: UnknownRecord): ValidationResult<AiLogicValidateRequest> {
  const errors: string[] = [];
  const itinerary = asRecord(payload.itinerary);

  if (!itinerary) {
    return failure(['itinerary es requerido']);
  }

  const destination = asText(itinerary.destination);
  if (!destination) errors.push('itinerary.destination es requerido');

  if (!Array.isArray(itinerary.days) || itinerary.days.length === 0) {
    errors.push('itinerary.days debe incluir al menos un día');
  }

  const days: AiLogicValidateRequest['itinerary']['days'] = [];
  if (Array.isArray(itinerary.days)) {
    for (let index = 0; index < itinerary.days.length; index += 1) {
      const dayRecord = asRecord(itinerary.days[index]);
      if (!dayRecord) {
        errors.push(`itinerary.days[${index}] inválido`);
        continue;
      }

      const dayIndex = asNumber(dayRecord.dayIndex);
      if (dayIndex === undefined || !Number.isInteger(dayIndex) || dayIndex <= 0) {
        errors.push(`itinerary.days[${index}].dayIndex inválido`);
      }

      if (!Array.isArray(dayRecord.activities)) {
        errors.push(`itinerary.days[${index}].activities inválido`);
        continue;
      }

      const activities: AiLogicValidateRequest['itinerary']['days'][number]['activities'] = [];
      for (let activityIndex = 0; activityIndex < dayRecord.activities.length; activityIndex += 1) {
        const activityRecord = asRecord(dayRecord.activities[activityIndex]);
        if (!activityRecord) {
          errors.push(`itinerary.days[${index}].activities[${activityIndex}] inválido`);
          continue;
        }

        const title = asText(activityRecord.title);
        const startsAtLocal = asText(activityRecord.startsAtLocal);
        const durationMinutes = asNumber(activityRecord.durationMinutes);
        const minAge = asNumber(activityRecord.minAge);

        if (!title) errors.push(`itinerary.days[${index}].activities[${activityIndex}].title es requerido`);
        if (startsAtLocal && !isValidTime(startsAtLocal)) {
          errors.push(`itinerary.days[${index}].activities[${activityIndex}].startsAtLocal inválido`);
        }
        if (durationMinutes !== undefined && (!Number.isInteger(durationMinutes) || durationMinutes <= 0)) {
          errors.push(`itinerary.days[${index}].activities[${activityIndex}].durationMinutes inválido`);
        }
        if (minAge !== undefined && (!Number.isInteger(minAge) || minAge < 0)) {
          errors.push(`itinerary.days[${index}].activities[${activityIndex}].minAge inválido`);
        }

        activities.push({
          title: title as string,
          startsAtLocal,
          durationMinutes,
          minAge
        });
      }

      days.push({
        dayIndex: dayIndex as number,
        activities
      });
    }
  }

  if (errors.length > 0) return failure(errors);

  return success({
    itinerary: {
      destination: destination as string,
      days
    }
  });
}
