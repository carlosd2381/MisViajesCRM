begin;

create table if not exists itineraries (
  id uuid primary key,
  client_id uuid not null references clients(id),
  agent_id text not null,
  title text not null,
  status text not null,
  start_date date,
  end_date date,
  currency char(3) not null,
  gross_total numeric(14, 2) not null,
  net_total numeric(14, 2) not null,
  markup_amount numeric(14, 2) not null,
  service_fee_amount numeric(14, 2) not null default 0,
  agency_profit numeric(14, 2) not null,
  ai_narrative_intro text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint itineraries_status_ck check (
    status in ('draft', 'sent', 'accepted', 'paid', 'completed', 'cancelled')
  ),
  constraint itineraries_currency_ck check (currency in ('MXN', 'USD', 'EUR'))
);

create index if not exists idx_itineraries_client on itineraries(client_id);
create index if not exists idx_itineraries_agent on itineraries(agent_id);
create index if not exists idx_itineraries_status on itineraries(status);
create index if not exists idx_itineraries_created on itineraries(created_at);

commit;
