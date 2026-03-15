import type { ItineraryRepository } from '../domain/itinerary-repository';
import type { Itinerary } from '../domain/itinerary';
import type { ItineraryItem } from '../domain/itinerary-item';
import type { ItineraryStatusEvent } from '../domain/itinerary-status-event';
import type { ItineraryDay } from '../domain/itinerary-day';
import type { ItineraryDayActivity } from '../domain/itinerary-day-activity';
import type { DestinationLibraryEntry, DestinationLibrarySearchQuery } from '../domain/destination-library-entry';
import type { ProposalPublication } from '../domain/proposal-publication';
import type { ProposalActionEvent } from '../domain/proposal-action-event';

export class InMemoryItineraryRepository implements ItineraryRepository {
  private readonly items = new Map<string, Itinerary>();
  private readonly itineraryItems = new Map<string, ItineraryItem[]>();
  private readonly statusEvents = new Map<string, ItineraryStatusEvent[]>();
  private readonly itineraryDays = new Map<string, ItineraryDay[]>();
  private readonly dayActivities = new Map<string, ItineraryDayActivity[]>();
  private readonly proposalPublications = new Map<string, ProposalPublication>();
  private readonly proposalPublicationsByHash = new Map<string, ProposalPublication>();
  private readonly proposalActionEvents = new Map<string, ProposalActionEvent[]>();
  private readonly destinationLibraryEntries: DestinationLibraryEntry[] = [
    {
      id: 'dest_oaxaca_activity_montealban',
      locationName: 'Oaxaca',
      category: 'activity',
      title: 'Monte Albán arqueológico',
      customDescriptionEs: 'Recorrido cultural con guía privado por Monte Albán y miradores históricos.',
      customDescriptionEn: 'Private cultural tour through Monte Albán and historical viewpoints.',
      highResMediaUrl: 'https://cdn.misviajescrm.local/library/oaxaca/montealban.jpg',
      latitude: 17.0435,
      longitude: -96.7678,
      tags: ['historia', 'cultura', 'arqueologia'],
      isActive: true,
      createdAt: '2026-03-14T00:00:00.000Z',
      updatedAt: '2026-03-14T00:00:00.000Z'
    },
    {
      id: 'dest_oaxaca_hotel_boutique',
      locationName: 'Oaxaca',
      category: 'hotel',
      title: 'Hotel boutique centro histórico',
      customDescriptionEs: 'Propiedad boutique en centro histórico con enfoque gastronómico y diseño local.',
      customDescriptionEn: 'Boutique property in historic center with gastronomic and local design focus.',
      highResMediaUrl: 'https://cdn.misviajescrm.local/library/oaxaca/hotel-boutique.jpg',
      latitude: 17.0607,
      longitude: -96.7253,
      tags: ['boutique', 'lujo', 'centrico'],
      isActive: true,
      createdAt: '2026-03-14T00:00:00.000Z',
      updatedAt: '2026-03-14T00:00:00.000Z'
    }
  ];

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

  async listStatusEvents(itineraryId: string): Promise<ItineraryStatusEvent[]> {
    return this.statusEvents.get(itineraryId) ?? [];
  }

  async createStatusEvent(event: ItineraryStatusEvent): Promise<ItineraryStatusEvent> {
    const current = this.statusEvents.get(event.itineraryId) ?? [];
    const next = [event, ...current];
    this.statusEvents.set(event.itineraryId, next);
    return event;
  }

  async listDays(itineraryId: string): Promise<ItineraryDay[]> {
    const days = this.itineraryDays.get(itineraryId) ?? [];
    return [...days].sort((left, right) => left.dayIndex - right.dayIndex);
  }

  async getDayById(itineraryId: string, dayId: string): Promise<ItineraryDay | null> {
    const days = this.itineraryDays.get(itineraryId) ?? [];
    return days.find((day) => day.id === dayId) ?? null;
  }

  async createDay(day: ItineraryDay): Promise<ItineraryDay> {
    const current = this.itineraryDays.get(day.itineraryId) ?? [];
    this.itineraryDays.set(day.itineraryId, [...current, day]);
    return day;
  }

  async updateDay(day: ItineraryDay): Promise<ItineraryDay> {
    const current = this.itineraryDays.get(day.itineraryId) ?? [];
    const next = current.map((item) => (item.id === day.id ? day : item));
    this.itineraryDays.set(day.itineraryId, next);
    return day;
  }

  async listDayActivities(itineraryId: string, dayId: string): Promise<ItineraryDayActivity[]> {
    const activities = this.dayActivities.get(dayId) ?? [];
    return activities
      .filter((activity) => activity.itineraryId === itineraryId)
      .sort((left, right) => left.activityIndex - right.activityIndex);
  }

  async listAllDayActivities(itineraryId: string): Promise<ItineraryDayActivity[]> {
    const all = Array.from(this.dayActivities.values()).flat();
    return all
      .filter((activity) => activity.itineraryId === itineraryId)
      .sort((left, right) => left.activityIndex - right.activityIndex);
  }

  async getDayActivityById(itineraryId: string, dayId: string, activityId: string): Promise<ItineraryDayActivity | null> {
    const activities = this.dayActivities.get(dayId) ?? [];
    return activities.find((activity) => activity.itineraryId === itineraryId && activity.id === activityId) ?? null;
  }

  async createDayActivity(activity: ItineraryDayActivity): Promise<ItineraryDayActivity> {
    const current = this.dayActivities.get(activity.itineraryDayId) ?? [];
    this.dayActivities.set(activity.itineraryDayId, [...current, activity]);
    return activity;
  }

  async updateDayActivity(activity: ItineraryDayActivity): Promise<ItineraryDayActivity> {
    const current = this.dayActivities.get(activity.itineraryDayId) ?? [];
    const next = current.map((item) => (item.id === activity.id ? activity : item));
    this.dayActivities.set(activity.itineraryDayId, next);
    return activity;
  }

  async searchDestinationLibrary(query: DestinationLibrarySearchQuery): Promise<DestinationLibraryEntry[]> {
    const locationTerm = query.location?.trim().toLowerCase();
    const filtered = this.destinationLibraryEntries
      .filter((entry) => entry.isActive)
      .filter((entry) => {
        if (query.category && entry.category !== query.category) return false;
        if (!locationTerm) return true;
        return entry.locationName.toLowerCase().includes(locationTerm)
          || entry.title.toLowerCase().includes(locationTerm)
          || entry.tags.some((tag) => tag.toLowerCase().includes(locationTerm));
      })
      .slice(0, query.limit);

    return filtered;
  }

  async createProposalPublication(publication: ProposalPublication): Promise<ProposalPublication> {
    this.proposalPublications.set(publication.id, publication);
    this.proposalPublicationsByHash.set(publication.hash, publication);
    return publication;
  }

  async getProposalPublicationByHash(hash: string): Promise<ProposalPublication | null> {
    return this.proposalPublicationsByHash.get(hash) ?? null;
  }

  async updateProposalPublication(publication: ProposalPublication): Promise<ProposalPublication> {
    this.proposalPublications.set(publication.id, publication);
    this.proposalPublicationsByHash.set(publication.hash, publication);
    return publication;
  }

  async createProposalActionEvent(event: ProposalActionEvent): Promise<ProposalActionEvent> {
    const current = this.proposalActionEvents.get(event.proposalPublicationId) ?? [];
    this.proposalActionEvents.set(event.proposalPublicationId, [event, ...current]);
    return event;
  }

  async listProposalActionEvents(proposalPublicationId: string): Promise<ProposalActionEvent[]> {
    return this.proposalActionEvents.get(proposalPublicationId) ?? [];
  }
}
