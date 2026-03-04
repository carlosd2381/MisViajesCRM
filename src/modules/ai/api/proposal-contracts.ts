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
    sections: AiProfileSections;
  };
}
