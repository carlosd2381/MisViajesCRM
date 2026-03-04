import type { Client } from './client';

export interface ClientRepository {
  list(): Promise<Client[]>;
  getById(id: string): Promise<Client | null>;
  create(entity: Client): Promise<Client>;
  update(entity: Client): Promise<Client>;
}
