import type { ItineraryStatus } from './itinerary';

export interface ItineraryStatusEvent {
  id: string;
  itineraryId: string;
  fromStatus?: ItineraryStatus;
  toStatus: ItineraryStatus;
  changedBy?: string;
  changedAt: string;
  notes?: string;
}
