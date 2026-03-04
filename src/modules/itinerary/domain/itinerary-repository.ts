import type { Itinerary } from './itinerary';
import type { ItineraryItem } from './itinerary-item';

export interface ItineraryRepository {
  list(): Promise<Itinerary[]>;
  getById(id: string): Promise<Itinerary | null>;
  create(entity: Itinerary): Promise<Itinerary>;
  update(entity: Itinerary): Promise<Itinerary>;
  listItems(itineraryId: string): Promise<ItineraryItem[]>;
  createItem(item: ItineraryItem): Promise<ItineraryItem>;
}
