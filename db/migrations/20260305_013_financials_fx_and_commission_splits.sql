begin;

alter table financial_transactions
  add column if not exists exchange_rate_recorded_at timestamptz,
  add column if not exists exchange_rate_source text not null default 'manual';

update financial_transactions
set exchange_rate_recorded_at = created_at
where exchange_rate_recorded_at is null;

alter table financial_transactions
  alter column exchange_rate_recorded_at set not null;

alter table financial_transactions
  drop constraint if exists financial_transactions_exchange_rate_source_ck;

alter table financial_transactions
  add constraint financial_transactions_exchange_rate_source_ck
  check (exchange_rate_source in ('manual', 'provider_quote', 'provider_booking', 'sat_reference', 'bank_reference'));

create table if not exists itinerary_commission_splits (
  id text primary key,
  itinerary_id text not null,
  supplier_id text not null,
  commission_id text,
  split_percent numeric(7, 4),
  split_amount_mxn numeric(14, 2) not null,
  basis_amount_mxn numeric(14, 2),
  status text not null,
  effective_at timestamptz not null,
  notes text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint itinerary_commission_splits_status_ck check (status in ('planned', 'locked', 'settled', 'disputed')),
  constraint itinerary_commission_splits_percent_ck check (split_percent is null or (split_percent >= 0 and split_percent <= 100)),
  constraint itinerary_commission_splits_amount_ck check (split_amount_mxn >= 0),
  constraint itinerary_commission_splits_basis_ck check (basis_amount_mxn is null or basis_amount_mxn >= 0)
);

create index if not exists idx_itinerary_commission_splits_itinerary on itinerary_commission_splits(itinerary_id);
create index if not exists idx_itinerary_commission_splits_supplier on itinerary_commission_splits(supplier_id);
create index if not exists idx_itinerary_commission_splits_status on itinerary_commission_splits(status);
create index if not exists idx_itinerary_commission_splits_effective_at on itinerary_commission_splits(effective_at);

commit;
