import type { PromptProfile } from '../domain/prompt-profile';

export type AiWarningSeverity = 'low' | 'medium' | 'high';

export interface AiProposalWarning {
  code: string;
  severity: AiWarningSeverity;
  message: string;
}

export interface CreateAiProposalRequest {
  promptProfile: PromptProfile;
  itinerarySummary: string;
  destination: string;
  days: number;
}

export interface AiProposalResponse {
  data: {
    profile: PromptProfile;
    narrative: string;
    qualityChecks: string[];
    warnings: AiProposalWarning[];
  };
}
