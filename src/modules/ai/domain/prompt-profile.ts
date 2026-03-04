export const PROMPT_PROFILE = [
  'storyteller',
  'auditor',
  'ghost_writer',
  'local_insider'
] as const;

export type PromptProfile = (typeof PROMPT_PROFILE)[number];
