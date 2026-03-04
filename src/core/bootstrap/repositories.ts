import type { LeadRepository } from '../../modules/leads/domain/lead-repository';
import type { ClientRepository } from '../../modules/clients/domain/client-repository';
import type { ItineraryRepository } from '../../modules/itinerary/domain/itinerary-repository';
import type { SupplierRepository } from '../../modules/suppliers/domain/supplier-repository';
import type { CommissionRepository } from '../../modules/commissions/domain/commission-repository';
import { InMemoryLeadRepository } from '../../modules/leads/infrastructure/in-memory-lead-repository';
import { InMemoryClientRepository } from '../../modules/clients/infrastructure/in-memory-client-repository';
import { InMemoryItineraryRepository } from '../../modules/itinerary/infrastructure/in-memory-itinerary-repository';
import { InMemorySupplierRepository } from '../../modules/suppliers/infrastructure/in-memory-supplier-repository';
import { InMemoryCommissionRepository } from '../../modules/commissions/infrastructure/in-memory-commission-repository';
import { PostgresLeadRepository } from '../../modules/leads/infrastructure/postgres-lead-repository';
import { PostgresClientRepository } from '../../modules/clients/infrastructure/postgres-client-repository';
import { PostgresItineraryRepository } from '../../modules/itinerary/infrastructure/postgres-itinerary-repository';
import { PostgresSupplierRepository } from '../../modules/suppliers/infrastructure/postgres-supplier-repository';
import { PostgresCommissionRepository } from '../../modules/commissions/infrastructure/postgres-commission-repository';

export interface RepositoryBundle {
  leads: LeadRepository;
  clients: ClientRepository;
  suppliers: SupplierRepository;
  commissions: CommissionRepository;
  itineraries: ItineraryRepository;
}

export function buildRepositories(): RepositoryBundle {
  const storageMode = process.env.STORAGE_MODE ?? 'memory';

  if (storageMode === 'postgres') {
    return {
      leads: new PostgresLeadRepository(),
      clients: new PostgresClientRepository(),
      suppliers: new PostgresSupplierRepository(),
      commissions: new PostgresCommissionRepository(),
      itineraries: new PostgresItineraryRepository()
    };
  }

  return {
    leads: new InMemoryLeadRepository(),
    clients: new InMemoryClientRepository(),
    suppliers: new InMemorySupplierRepository(),
    commissions: new InMemoryCommissionRepository(),
    itineraries: new InMemoryItineraryRepository()
  };
}
