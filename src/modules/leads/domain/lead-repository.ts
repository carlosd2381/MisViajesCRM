import type { Lead } from './lead';

export interface LeadRepository {
  list(): Promise<Lead[]>;
  getById(id: string): Promise<Lead | null>;
  create(entity: Lead): Promise<Lead>;
  update(entity: Lead): Promise<Lead>;
}
