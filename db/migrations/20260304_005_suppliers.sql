begin;

create table if not exists suppliers (
  id text primary key,
  name text not null,
  trade_name text,
  type text not null,
  rfc text,
  status text not null,
  default_currency char(3) not null,
  commission_type text not null,
  commission_rate numeric(14, 2) not null,
  payout_terms text not null,
  internal_risk_flag text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint suppliers_type_ck check (
    type in ('wholesaler', 'hotel', 'airline', 'dmc', 'car_rental', 'insurance', 'tour_operator', 'private_transport', 'cruise_line')
  ),
  constraint suppliers_status_ck check (status in ('active', 'inactive', 'blacklisted')),
  constraint suppliers_currency_ck check (default_currency in ('MXN', 'USD', 'EUR')),
  constraint suppliers_commission_type_ck check (commission_type in ('percentage', 'fixed')),
  constraint suppliers_payout_terms_ck check (payout_terms in ('prepaid', 'post_travel_30', 'post_travel_60', 'upon_booking')),
  constraint suppliers_risk_ck check (internal_risk_flag in ('high_risk', 'caution', 'reliable')),
  constraint suppliers_commission_rate_ck check (commission_rate >= 0)
);

create index if not exists idx_suppliers_type on suppliers(type);
create index if not exists idx_suppliers_status on suppliers(status);
create index if not exists idx_suppliers_name on suppliers(name);

commit;
