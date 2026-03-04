import type { ItineraryStatus } from '../domain/itinerary';
import type { ItineraryItemCategory } from '../domain/itinerary-item';

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
