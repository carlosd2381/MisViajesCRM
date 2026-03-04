import type { Supplier } from './supplier';

export interface SupplierRepository {
  list(): Promise<Supplier[]>;
  getById(id: string): Promise<Supplier | null>;
  create(entity: Supplier): Promise<Supplier>;
  update(entity: Supplier): Promise<Supplier>;
}
