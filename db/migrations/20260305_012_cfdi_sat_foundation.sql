begin;

create table if not exists sat_certificates (
  id text primary key,
  rfc_emisor text not null,
  certificate_number text not null unique,
  serial_number text,
  certificate_source text not null,
  status text not null,
  valid_from date not null,
  valid_to date not null,
  certificate_pem_ref text,
  private_key_ref text,
  passphrase_ref text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint sat_certificates_source_ck check (certificate_source in ('csd', 'fiel', 'other')),
  constraint sat_certificates_status_ck check (status in ('pending_validation', 'active', 'expired', 'revoked')),
  constraint sat_certificates_valid_range_ck check (valid_to >= valid_from)
);

create index if not exists idx_sat_certificates_rfc on sat_certificates(rfc_emisor);
create index if not exists idx_sat_certificates_status on sat_certificates(status);

create table if not exists cfdi_invoices (
  id text primary key,
  itinerary_id text,
  financial_transaction_id text,
  client_id text,
  sat_certificate_id text,
  serie text,
  folio text,
  cfdi_uuid text unique,
  rfc_emisor text not null,
  rfc_receptor text not null,
  uso_cfdi text,
  tipo_comprobante text not null,
  metodo_pago text,
  forma_pago text,
  moneda char(3) not null,
  tipo_cambio numeric(14, 6),
  subtotal numeric(14, 2) not null,
  impuestos_total numeric(14, 2) not null,
  total numeric(14, 2) not null,
  xml_unsigned text,
  cadena_original text,
  sello_digital text,
  xml_stamped text,
  status text not null,
  issue_date timestamptz not null,
  stamped_at timestamptz,
  cancelled_at timestamptz,
  last_error text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint cfdi_invoices_tipo_comprobante_ck check (tipo_comprobante in ('I', 'E', 'P', 'N', 'T')),
  constraint cfdi_invoices_status_ck check (status in ('draft', 'ready_to_stamp', 'stamped', 'cancelled', 'error')),
  constraint cfdi_invoices_subtotal_ck check (subtotal >= 0),
  constraint cfdi_invoices_impuestos_total_ck check (impuestos_total >= 0),
  constraint cfdi_invoices_total_ck check (total >= 0),
  constraint cfdi_invoices_tipo_cambio_ck check (tipo_cambio is null or tipo_cambio > 0)
);

create index if not exists idx_cfdi_invoices_status on cfdi_invoices(status);
create index if not exists idx_cfdi_invoices_issue_date on cfdi_invoices(issue_date);
create index if not exists idx_cfdi_invoices_rfc_emisor on cfdi_invoices(rfc_emisor);
create index if not exists idx_cfdi_invoices_rfc_receptor on cfdi_invoices(rfc_receptor);
create index if not exists idx_cfdi_invoices_itinerary on cfdi_invoices(itinerary_id);

create table if not exists cfdi_invoice_events (
  id text primary key,
  cfdi_invoice_id text not null,
  event_type text not null,
  detail_json jsonb,
  event_at timestamptz not null,
  created_at timestamptz not null,
  constraint cfdi_invoice_events_type_ck check (event_type in ('generated', 'validation_passed', 'validation_failed', 'stamped', 'cancelled', 'error'))
);

create index if not exists idx_cfdi_invoice_events_invoice on cfdi_invoice_events(cfdi_invoice_id);
create index if not exists idx_cfdi_invoice_events_type on cfdi_invoice_events(event_type);
create index if not exists idx_cfdi_invoice_events_event_at on cfdi_invoice_events(event_at);

commit;
