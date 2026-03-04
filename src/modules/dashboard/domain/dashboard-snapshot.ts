export interface DashboardSnapshot {
  id: string;
  periodStart: string;
  periodEnd: string;
  leadsTotal: number;
  leadsWon: number;
  itinerariesAccepted: number;
  commissionsPending: number;
  commissionsPaid: number;
  revenueMxn: number;
  profitMxn: number;
  createdAt: string;
  updatedAt: string;
}
