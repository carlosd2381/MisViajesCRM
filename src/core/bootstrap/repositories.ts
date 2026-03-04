import type { LeadRepository } from '../../modules/leads/domain/lead-repository';
import type { ClientRepository } from '../../modules/clients/domain/client-repository';
import type { ItineraryRepository } from '../../modules/itinerary/domain/itinerary-repository';
import { InMemoryLeadRepository } from '../../modules/leads/infrastructure/in-memory-lead-repository';
import { InMemoryClientRepository } from '../../modules/clients/infrastructure/in-memory-client-repository';
import { InMemoryItineraryRepository } from '../../modules/itinerary/infrastructure/in-memory-itinerary-repository';
import { PostgresLeadRepository } from '../../modules/leads/infrastructure/postgres-lead-repository';
import { PostgresClientRepository } from '../../modules/clients/infrastructure/postgres-client-repository';
import { PostgresItineraryRepository } from '../../modules/itinerary/infrastructure/postgres-itinerary-repository';

export interface RepositoryBundle {
  leads: LeadRepository;
  clients: ClientRepository;
  itineraries: ItineraryRepository;
}

export function buildRepositories(): RepositoryBundle {
  const storageMode = process.env.STORAGE_MODE ?? 'memory';

  if (storageMode === 'postgres') {
    return {
      leads: new PostgresLeadRepository(),
      clients: new PostgresClientRepository(),
      itineraries: new PostgresItineraryRepository()
    };
  }

  return {
    leads: new InMemoryLeadRepository(),
    clients: new InMemoryClientRepository(),
    itineraries: new InMemoryItineraryRepository()
  };
}
