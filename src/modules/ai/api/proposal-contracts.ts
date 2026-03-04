import type { PromptProfile } from '../domain/prompt-profile';

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
    warnings: string[];
  };
}
