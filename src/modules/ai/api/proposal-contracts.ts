import type { PromptProfile } from '../domain/prompt-profile';

export type AiWarningSeverity = 'low' | 'medium' | 'high';

export interface AiProposalWarning {
  code: string;
  severity: AiWarningSeverity;
  message: string;
}

export interface StorytellerSection {
  tripHook: string;
  dayNarrative: string;
}

export interface AuditorSection {
  operationalChecklist: string[];
  riskNotes: string[];
}

export interface GhostWriterSection {
  headline: string;
  callToAction: string;
}

export interface LocalInsiderSection {
  localTips: string[];
  signatureExperience: string;
}

export interface AiProfileSections {
  storyteller: StorytellerSection;
  auditor: AuditorSection;
  ghost_writer: GhostWriterSection;
  local_insider: LocalInsiderSection;
}

export interface AiRenderOptions {
  includeWarnings?: boolean;
  compactMode?: boolean;
}

export interface CreateAiProposalRequest {
  promptProfile: PromptProfile;
  itinerarySummary: string;
  destination: string;
  days: number;
  enforceQualityGate?: boolean;
  renderOptions?: AiRenderOptions;
}

export interface AiProposalResponse {
  data: {
    schemaVersion: 'ai-proposal.v1';
    generatedAt: string;
    profile: PromptProfile;
    narrative: string;
    qualityChecks: string[];
    warnings: AiProposalWarning[];
    sectionOrder: ReadonlyArray<'storyteller' | 'auditor' | 'ghost_writer' | 'local_insider'>;
    sections: AiProfileSections;
  };
}

export interface AiItineraryGenerateRequest {
  guestProfile?: {
    ageGroup?: string;
    mobilityNotes?: string;
    travelerCount?: number;
  };
  durationDays: number;
  destination: string;
  interests: string[];
}

export interface AiItineraryGenerateResponse {
  data: {
    schemaVersion: 'ai-itinerary.v1';
    destination: string;
    durationDays: number;
    days: Array<{
      dayIndex: number;
      title: string;
      summary: string;
      activities: Array<{
        title: string;
        category: string;
        startsAtLocal?: string;
        durationMinutes?: number;
        notes?: string;
      }>;
    }>;
  };
}

export const AI_TONE_TARGETS = ['luxury_inspiring', 'practical_direct'] as const;

export type AiToneTarget = (typeof AI_TONE_TARGETS)[number];

export interface AiToneTransformRequest {
  sourceText: string;
  targetTone: AiToneTarget;
}

export interface AiToneTransformResponse {
  data: {
    transformedText: string;
    targetTone: AiToneTarget;
  };
}

export interface AiLogicValidateRequest {
  itinerary: {
    destination: string;
    days: Array<{
      dayIndex: number;
      activities: Array<{
        title: string;
        startsAtLocal?: string;
        durationMinutes?: number;
        minAge?: number;
      }>;
    }>;
  };
}

export type AiLogicWarningSeverity = 'low' | 'medium' | 'high';

export interface AiLogicWarning {
  code: string;
  severity: AiLogicWarningSeverity;
  message: string;
  dayIndex?: number;
}

export interface AiLogicValidateResponse {
  data: {
    schemaVersion: 'ai-itinerary-logic.v1';
    warnings: AiLogicWarning[];
  };
}
