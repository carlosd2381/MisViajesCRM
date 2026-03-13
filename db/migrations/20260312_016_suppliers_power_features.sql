begin;

alter table suppliers
  add column if not exists service_model text,
  add column if not exists market_focus_tags text[] not null default '{}',
  add column if not exists tier_level text,
  add column if not exists billing_address text,
  add column if not exists contract_expiry_date date,
  add column if not exists blackout_dates text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists internal_rating integer,
  add column if not exists response_time_score integer;

alter table suppliers
  drop constraint if exists suppliers_commission_type_ck,
  add constraint suppliers_commission_type_ck check (commission_type in ('percentage', 'fixed', 'net_rate'));

alter table suppliers
  drop constraint if exists suppliers_payout_terms_ck,
  add constraint suppliers_payout_terms_ck check (payout_terms in ('prepaid', 'post_trip_15', 'post_travel_30', 'credit_30', 'upon_booking'));

alter table suppliers
  add constraint suppliers_service_model_ck check (service_model is null or service_model in ('shared', 'private')),
  add constraint suppliers_tier_level_ck check (tier_level is null or tier_level in ('gold', 'silver', 'bronze')),
  add constraint suppliers_internal_rating_ck check (internal_rating is null or (internal_rating >= 1 and internal_rating <= 5)),
  add constraint suppliers_response_time_score_ck check (response_time_score is null or (response_time_score >= 0 and response_time_score <= 100));

create index if not exists idx_suppliers_tier_level on suppliers(tier_level);
create index if not exists idx_suppliers_contract_expiry on suppliers(contract_expiry_date);

create table if not exists supplier_incidents (
  id text primary key,
  supplier_id text not null references suppliers(id),
  occurred_at timestamptz not null,
  client_name text,
  summary text not null,
  severity text not null,
  created_at timestamptz not null,
  constraint supplier_incidents_severity_ck check (severity in ('low', 'medium', 'high'))
);

create index if not exists idx_supplier_incidents_supplier_date on supplier_incidents(supplier_id, occurred_at desc);

commit;
