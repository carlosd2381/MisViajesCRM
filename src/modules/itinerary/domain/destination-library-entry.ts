export const DESTINATION_LIBRARY_CATEGORY = ['activity', 'hotel', 'dining', 'transfer', 'other'] as const;

export type DestinationLibraryCategory = (typeof DESTINATION_LIBRARY_CATEGORY)[number];

export interface DestinationLibraryEntry {
  id: string;
  locationName: string;
  category: DestinationLibraryCategory;
  title: string;
  customDescriptionEs?: string;
  customDescriptionEn?: string;
  highResMediaUrl?: string;
  latitude?: number;
  longitude?: number;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DestinationLibrarySearchQuery {
  location?: string;
  category?: DestinationLibraryCategory;
  limit: number;
}
