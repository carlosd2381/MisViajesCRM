import { failure, success, type ValidationResult } from '../../../core/validation/validation-types';
import type { CreateAiProposalRequest } from './proposal-contracts';
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
