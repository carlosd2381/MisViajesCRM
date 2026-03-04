import type { SupplierRepository } from '../domain/supplier-repository';
import type { Supplier } from '../domain/supplier';

export class InMemorySupplierRepository implements SupplierRepository {
  private readonly items = new Map<string, Supplier>();

  async list(): Promise<Supplier[]> {
    return Array.from(this.items.values());
  }

  async getById(id: string): Promise<Supplier | null> {
    return this.items.get(id) ?? null;
  }

  async create(entity: Supplier): Promise<Supplier> {
    this.items.set(entity.id, entity);
    return entity;
  }

  async update(entity: Supplier): Promise<Supplier> {
    this.items.set(entity.id, entity);
    return entity;
  }
}
