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
  enforceQualityGate?: boolean;
}

export interface AiProposalResponse {
  data: {
    schemaVersion: 'ai-proposal.v1';
    generatedAt: string;
    profile: PromptProfile;
    narrative: string;
    qualityChecks: string[];
    warnings: AiProposalWarning[];
    sectionOrder: Array<'storyteller' | 'auditor' | 'ghost_writer' | 'local_insider'>;
    sections: AiProfileSections;
  };
}
