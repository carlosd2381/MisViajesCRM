import type { ItineraryStatus } from '../domain/itinerary';

export const KANBAN_PIPELINE_STATUSES = ['draft', 'sent', 'revised', 'accepted'] as const;

export type KanbanPipelineStatus = (typeof KANBAN_PIPELINE_STATUSES)[number];

export interface PipelineMoveRequest {
  toStatus: KanbanPipelineStatus;
  notes?: string;
}

export interface ItineraryKanbanCard {
  itineraryId: string;
  clientId: string;
  title: string;
  status: ItineraryStatus;
  updatedAt: string;
  startDate?: string;
  endDate?: string;
  grossTotal: number;
  currency: 'MXN' | 'USD' | 'EUR';
  lastSentAt?: string;
  lastRevisedAt?: string;
  acceptedAt?: string;
}

export interface ItineraryKanbanColumn {
  key: KanbanPipelineStatus;
  label: string;
  count: number;
  cards: ItineraryKanbanCard[];
}

export interface ItineraryDayRequest {
  dayIndex: number;
  dayDate?: string;
  title: string;
  summary?: string;
}

export interface ItineraryDayActivityRequest {
  activityIndex: number;
  title: string;
  category: 'flight' | 'hotel' | 'transfer' | 'tour' | 'dining' | 'activity' | 'insurance' | 'fee' | 'other';
  descriptionEs?: string;
  descriptionEn?: string;
  startsAtLocal?: string;
  durationMinutes?: number;
  priceNet: number;
  priceGross: number;
  optionalEnabled?: boolean;
  mediaUrl?: string;
  latitude?: number;
  longitude?: number;
}

export interface PublishProposalRequest {
  expiresAt?: string;
}

export interface PublishProposalResponse {
  publicationId: string;
  hash: string;
  urlPath: string;
  status: 'active' | 'revoked' | 'expired';
  publishedAt: string;
  expiresAt?: string;
}

export interface ProposalActionApproveRequest {
  message?: string;
}

export interface ProposalActionRevisionRequest {
  feedback: string;
}

export interface AiItineraryGenerateRequest {
  guestProfile: {
    ageGroup?: string;
    mobilityNotes?: string;
    travelerCount?: number;
  };
  durationDays: number;
  destination: string;
  interests: string[];
}

export interface AiItineraryGenerateResponse {
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
}

export interface AiToneTransformRequest {
  sourceText: string;
  targetTone: 'luxury_inspiring' | 'practical_direct';
}

export interface AiToneTransformResponse {
  transformedText: string;
  targetTone: 'luxury_inspiring' | 'practical_direct';
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

export interface AiLogicValidateResponse {
  schemaVersion: 'ai-itinerary-logic.v1';
  warnings: Array<{
    code: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
    dayIndex?: number;
  }>;
}
