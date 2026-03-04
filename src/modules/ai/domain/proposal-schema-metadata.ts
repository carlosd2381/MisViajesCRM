import { PROMPT_PROFILE } from './prompt-profile';

export function buildAiProposalSchemaMetadata() {
  return {
    schemaVersion: 'ai-proposal.v1' as const,
    endpoint: '/ai/proposal',
    method: 'POST' as const,
    requiredFields: ['promptProfile', 'itinerarySummary', 'destination', 'days'] as const,
    optionalFields: ['enforceQualityGate'] as const,
    profiles: PROMPT_PROFILE,
    warningsCatalog: [
      {
        code: 'SUMMARY_TOO_SHORT',
        severity: 'medium',
        description: 'Itinerary summary has low detail density for proposal generation.'
      },
      {
        code: 'DESTINATION_NOT_REFERENCED',
        severity: 'low',
        description: 'Summary does not explicitly mention the destination.'
      },
      {
        code: 'DAY_BY_DAY_MISSING',
        severity: 'medium',
        description: 'Long itineraries should include day-by-day detail.'
      },
      {
        code: 'QUALITY_GATE_BLOCKER',
        severity: 'high',
        description: 'Summary does not pass strict quality threshold for long itineraries.'
      }
    ] as const,
    qualityGate: {
      inputField: 'enforceQualityGate',
      blockOnSeverity: 'high' as const,
      blockedStatusCode: 422
    },
    sectionOrder: ['storyteller', 'auditor', 'ghost_writer', 'local_insider'] as const
  };
}