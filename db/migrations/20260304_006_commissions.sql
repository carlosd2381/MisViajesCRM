begin;

create table if not exists commissions (
  id text primary key,
  itinerary_id text not null,
  supplier_id text not null,
  expected_amount numeric(14, 2) not null,
  actual_received numeric(14, 2),
  received_date date,
  due_date date not null,
  status text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint commissions_status_ck check (status in ('unclaimed', 'claimed', 'paid', 'disputed')),
  constraint commissions_expected_amount_ck check (expected_amount >= 0),
  constraint commissions_actual_received_ck check (actual_received is null or actual_received >= 0)
);

create index if not exists idx_commissions_itinerary on commissions(itinerary_id);
create index if not exists idx_commissions_supplier on commissions(supplier_id);
create index if not exists idx_commissions_status on commissions(status);
create index if not exists idx_commissions_due_date on commissions(due_date);

commit;
