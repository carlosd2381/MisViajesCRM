export interface PgCfdiEventRow {
  id: string;
  event_type: string;
  detail_json: Record<string, unknown> | null;
  event_at: string;
  created_at: string;
}

export interface PgCfdiEventRowWithInvoice extends PgCfdiEventRow {
  cfdi_invoice_id: string;
}

export function mapCfdiEventRow(row: PgCfdiEventRow): {
  id: string;
  eventType: string;
  detail: Record<string, unknown>;
  eventAt: string;
  createdAt: string;
} {
  return {
    id: row.id,
    eventType: row.event_type,
    detail: row.detail_json ?? {},
    eventAt: row.event_at,
    createdAt: row.created_at
  };
}

export function mapCfdiEventRowWithInvoice(row: PgCfdiEventRowWithInvoice): {
  id: string;
  invoiceId: string;
  eventType: string;
  detail: Record<string, unknown>;
  eventAt: string;
  createdAt: string;
} {
  return {
    invoiceId: row.cfdi_invoice_id,
    ...mapCfdiEventRow(row)
  };
}
