import type { FinancialRepository } from '../domain/financial-repository';
import type { FinancialTransaction } from '../domain/financial-transaction';

export class InMemoryFinancialRepository implements FinancialRepository {
  private readonly items = new Map<string, FinancialTransaction>();

  async list(): Promise<FinancialTransaction[]> {
    return Array.from(this.items.values());
  }

  async getById(id: string): Promise<FinancialTransaction | null> {
    return this.items.get(id) ?? null;
  }

  async create(entity: FinancialTransaction): Promise<FinancialTransaction> {
    this.items.set(entity.id, entity);
    return entity;
  }

  async update(entity: FinancialTransaction): Promise<FinancialTransaction> {
    this.items.set(entity.id, entity);
    return entity;
  }
}
