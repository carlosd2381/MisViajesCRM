export const ITINERARY_DAY_ACTIVITY_CATEGORY = [
  'flight',
  'hotel',
  'transfer',
  'tour',
  'dining',
  'activity',
  'insurance',
  'fee',
  'other'
] as const;

export type ItineraryDayActivityCategory = (typeof ITINERARY_DAY_ACTIVITY_CATEGORY)[number];

export interface ItineraryDayActivity {
  id: string;
  itineraryId: string;
  itineraryDayId: string;
  activityIndex: number;
  title: string;
  category: ItineraryDayActivityCategory;
  descriptionEs?: string;
  descriptionEn?: string;
  startsAtLocal?: string;
  durationMinutes?: number;
  priceNet: number;
  priceGross: number;
  optionalEnabled: boolean;
  mediaUrl?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}
