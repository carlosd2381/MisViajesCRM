import type { ItineraryStatus } from '../domain/itinerary';
import type { ItineraryItemCategory } from '../domain/itinerary-item';
import type { ItineraryDayActivityCategory } from '../domain/itinerary-day-activity';

export interface CreateItineraryRequest {
  clientId: string;
  agentId: string;
  title: string;
  status?: ItineraryStatus;
  startDate?: string;
  endDate?: string;
  currency: 'MXN' | 'USD' | 'EUR';
  grossTotal: number;
  netTotal: number;
  serviceFeeAmount?: number;
  aiNarrativeIntro?: string;
}

export interface UpdateItineraryRequest {
  title?: string;
  status?: ItineraryStatus;
  startDate?: string;
  endDate?: string;
  currency?: 'MXN' | 'USD' | 'EUR';
  grossTotal?: number;
  netTotal?: number;
  serviceFeeAmount?: number;
  aiNarrativeIntro?: string;
}

export interface CreateItineraryItemRequest {
  title: string;
  category: ItineraryItemCategory;
  quantity: number;
  unitNet: number;
  unitGross: number;
  serviceFeeAmount?: number;
}

export interface PipelineMoveRequest {
  toStatus: ItineraryStatus;
  notes?: string;
}

export interface CreateItineraryDayRequest {
  dayIndex: number;
  dayDate?: string;
  title: string;
  summary?: string;
}

export interface UpdateItineraryDayRequest {
  dayIndex?: number;
  dayDate?: string;
  title?: string;
  summary?: string;
}

export interface CreateItineraryDayActivityRequest {
  activityIndex: number;
  title: string;
  category: ItineraryDayActivityCategory;
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

export interface UpdateItineraryDayActivityRequest {
  activityIndex?: number;
  title?: string;
  category?: ItineraryDayActivityCategory;
  descriptionEs?: string;
  descriptionEn?: string;
  startsAtLocal?: string;
  durationMinutes?: number;
  priceNet?: number;
  priceGross?: number;
  optionalEnabled?: boolean;
  mediaUrl?: string;
  latitude?: number;
  longitude?: number;
}

export interface PublishProposalRequest {
  expiresAt?: string;
}

export interface PortalApproveProposalRequest {
  message?: string;
}

export interface PortalRequestRevisionRequest {
  feedback: string;
}
