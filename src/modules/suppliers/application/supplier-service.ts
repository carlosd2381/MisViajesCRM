import type { CreateSupplierRequest, UpdateSupplierRequest } from '../api/supplier-contracts';
import type { Supplier } from '../domain/supplier';

function nowIsoDate(): string {
  return new Date().toISOString();
}

function createEntityId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

export function mapCreateSupplierToEntity(input: CreateSupplierRequest): Supplier {
  const timestamp = nowIsoDate();

  return {
    id: createEntityId('supplier'),
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export function mapUpdateSupplierToEntity(current: Supplier, input: UpdateSupplierRequest): Supplier {
  return {
    ...current,
    ...input,
    updatedAt: nowIsoDate()
  };
}
