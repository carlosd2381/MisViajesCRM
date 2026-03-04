export const ITINERARY_ITEM_CATEGORY = [
  'flight',
  'hotel',
  'transfer',
  'tour',
  'insurance',
  'fee',
  'other'
] as const;

export type ItineraryItemCategory = (typeof ITINERARY_ITEM_CATEGORY)[number];

export interface ItineraryItem {
  id: string;
  itineraryId: string;
  title: string;
  category: ItineraryItemCategory;
  quantity: number;
  unitNet: number;
  unitGross: number;
  totalNet: number;
  totalGross: number;
  serviceFeeAmount: number;
  createdAt: string;
  updatedAt: string;
}
