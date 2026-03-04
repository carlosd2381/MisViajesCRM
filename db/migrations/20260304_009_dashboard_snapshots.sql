begin;

create table if not exists dashboard_snapshots (
  id text primary key,
  period_start date not null,
  period_end date not null,
  leads_total integer not null,
  leads_won integer not null,
  itineraries_accepted integer not null,
  commissions_pending integer not null,
  commissions_paid integer not null,
  revenue_mxn numeric(14, 2) not null,
  profit_mxn numeric(14, 2) not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint dashboard_snapshots_counts_ck check (
    leads_total >= 0 and leads_won >= 0 and itineraries_accepted >= 0 and commissions_pending >= 0 and commissions_paid >= 0
  ),
  constraint dashboard_snapshots_amounts_ck check (revenue_mxn >= 0 and profit_mxn >= 0),
  constraint dashboard_snapshots_period_ck check (period_end >= period_start)
);

create index if not exists idx_dashboard_snapshots_period on dashboard_snapshots(period_start, period_end);

commit;
