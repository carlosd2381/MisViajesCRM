import type { FinancialTransaction } from './financial-transaction';

export interface FinancialRepository {
  list(): Promise<FinancialTransaction[]>;
  getById(id: string): Promise<FinancialTransaction | null>;
  create(entity: FinancialTransaction): Promise<FinancialTransaction>;
  update(entity: FinancialTransaction): Promise<FinancialTransaction>;
}
