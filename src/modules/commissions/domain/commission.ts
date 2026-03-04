export const COMMISSION_STATUS = ['unclaimed', 'claimed', 'paid', 'disputed'] as const;

export type CommissionStatus = (typeof COMMISSION_STATUS)[number];

export interface Commission {
  id: string;
  itineraryId: string;
  supplierId: string;
  expectedAmount: number;
  actualReceived?: number;
  receivedDate?: string;
  dueDate: string;
  status: CommissionStatus;
  createdAt: string;
  updatedAt: string;
}
