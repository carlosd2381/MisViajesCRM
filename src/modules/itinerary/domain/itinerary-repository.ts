import type { Itinerary } from './itinerary';
import type { ItineraryItem } from './itinerary-item';
import type { ItineraryStatusEvent } from './itinerary-status-event';
import type { ItineraryDay } from './itinerary-day';
import type { ItineraryDayActivity } from './itinerary-day-activity';
import type { DestinationLibraryEntry, DestinationLibrarySearchQuery } from './destination-library-entry';
import type { ProposalPublication } from './proposal-publication';
import type { ProposalActionEvent } from './proposal-action-event';

export interface ItineraryRepository {
  list(): Promise<Itinerary[]>;
  getById(id: string): Promise<Itinerary | null>;
  create(entity: Itinerary): Promise<Itinerary>;
  update(entity: Itinerary): Promise<Itinerary>;
  listItems(itineraryId: string): Promise<ItineraryItem[]>;
  createItem(item: ItineraryItem): Promise<ItineraryItem>;
  listStatusEvents(itineraryId: string): Promise<ItineraryStatusEvent[]>;
  createStatusEvent(event: ItineraryStatusEvent): Promise<ItineraryStatusEvent>;
  listDays(itineraryId: string): Promise<ItineraryDay[]>;
  getDayById(itineraryId: string, dayId: string): Promise<ItineraryDay | null>;
  createDay(day: ItineraryDay): Promise<ItineraryDay>;
  updateDay(day: ItineraryDay): Promise<ItineraryDay>;
  listDayActivities(itineraryId: string, dayId: string): Promise<ItineraryDayActivity[]>;
  listAllDayActivities(itineraryId: string): Promise<ItineraryDayActivity[]>;
  getDayActivityById(itineraryId: string, dayId: string, activityId: string): Promise<ItineraryDayActivity | null>;
  createDayActivity(activity: ItineraryDayActivity): Promise<ItineraryDayActivity>;
  updateDayActivity(activity: ItineraryDayActivity): Promise<ItineraryDayActivity>;
  searchDestinationLibrary(query: DestinationLibrarySearchQuery): Promise<DestinationLibraryEntry[]>;
  createProposalPublication(publication: ProposalPublication): Promise<ProposalPublication>;
  getProposalPublicationByHash(hash: string): Promise<ProposalPublication | null>;
  updateProposalPublication(publication: ProposalPublication): Promise<ProposalPublication>;
  createProposalActionEvent(event: ProposalActionEvent): Promise<ProposalActionEvent>;
  listProposalActionEvents(proposalPublicationId: string): Promise<ProposalActionEvent[]>;
}
