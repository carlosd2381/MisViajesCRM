export const PROPOSAL_PUBLICATION_STATUS = ['active', 'revoked', 'expired'] as const;

export type ProposalPublicationStatus = (typeof PROPOSAL_PUBLICATION_STATUS)[number];

export interface ProposalPublication {
  id: string;
  itineraryId: string;
  hash: string;
  status: ProposalPublicationStatus;
  publishedBy?: string;
  publishedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  lastViewedAt?: string;
}
