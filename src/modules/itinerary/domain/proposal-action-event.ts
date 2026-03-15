export const PROPOSAL_ACTION = ['approve', 'request_revision', 'open'] as const;
export const PROPOSAL_ACTOR_TYPE = ['client', 'agent', 'system'] as const;

export type ProposalAction = (typeof PROPOSAL_ACTION)[number];
export type ProposalActorType = (typeof PROPOSAL_ACTOR_TYPE)[number];

export interface ProposalActionEvent {
  id: string;
  proposalPublicationId: string;
  itineraryId: string;
  action: ProposalAction;
  actorType: ProposalActorType;
  actorRef?: string;
  message?: string;
  createdAt: string;
}
