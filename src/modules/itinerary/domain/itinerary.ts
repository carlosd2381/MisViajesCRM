export const ITINERARY_STATUS = [
  'draft',
  'sent',
  'accepted',
  'paid',
  'completed',
  'cancelled'
] as const;

export type ItineraryStatus = (typeof ITINERARY_STATUS)[number];

export interface Itinerary {
  id: string;
  clientId: string;
  agentId: string;
  title: string;
  status: ItineraryStatus;
  startDate?: string;
  endDate?: string;
  currency: 'MXN' | 'USD' | 'EUR';
  grossTotal: number;
  netTotal: number;
  markupAmount: number;
  serviceFeeAmount: number;
  agencyProfit: number;
  aiNarrativeIntro?: string;
  createdAt: string;
  updatedAt: string;
}
