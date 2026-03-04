import type { ItineraryRepository } from '../domain/itinerary-repository';
import type { Itinerary } from '../domain/itinerary';
import type { ItineraryItem } from '../domain/itinerary-item';

export class InMemoryItineraryRepository implements ItineraryRepository {
  private readonly items = new Map<string, Itinerary>();
  private readonly itineraryItems = new Map<string, ItineraryItem[]>();

  async list(): Promise<Itinerary[]> {
    return Array.from(this.items.values());
  }

  async getById(id: string): Promise<Itinerary | null> {
    return this.items.get(id) ?? null;
  }

  async create(entity: Itinerary): Promise<Itinerary> {
    this.items.set(entity.id, entity);
    return entity;
  }

  async update(entity: Itinerary): Promise<Itinerary> {
    this.items.set(entity.id, entity);
    return entity;
  }

  async listItems(itineraryId: string): Promise<ItineraryItem[]> {
    return this.itineraryItems.get(itineraryId) ?? [];
  }

  async createItem(item: ItineraryItem): Promise<ItineraryItem> {
    const current = this.itineraryItems.get(item.itineraryId) ?? [];
    this.itineraryItems.set(item.itineraryId, [...current, item]);
    return item;
  }
}
