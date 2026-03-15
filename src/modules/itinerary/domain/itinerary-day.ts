export interface ItineraryDay {
  id: string;
  itineraryId: string;
  dayIndex: number;
  dayDate?: string;
  title: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
}
