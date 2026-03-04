-- Sprint 1: Core schema baseline (RBAC + Leads + Clients)
-- Scope: initial draft for local development and schema discussion.

begin;

create extension if not exists pgcrypto;

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_es_mx text not null,
  name_en_us text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  role_id uuid not null references roles(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  status text not null,
  source text not null,
  priority text not null,
  destination text not null,
  travel_start_date date,
  travel_end_date date,
  adults_count integer not null default 1,
  children_count integer not null default 0,
  budget_min numeric(14, 2),
  budget_max numeric(14, 2),
  budget_currency char(3),
  trip_type text,
  notes text,
  assigned_agent_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_status_ck check (
    status in ('new', 'contacted', 'proposal_sent', 'follow_up', 'closed_won', 'closed_lost')
  ),
  constraint leads_source_ck check (
    source in ('whatsapp', 'instagram', 'facebook', 'referral', 'website', 'walk_in')
  ),
  constraint leads_priority_ck check (priority in ('low', 'medium', 'high', 'vip')),
  constraint leads_budget_currency_ck check (budget_currency in ('MXN', 'USD', 'EUR') or budget_currency is null)
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id),
  first_name text not null,
  middle_name text,
  paternal_last_name text not null,
  maternal_last_name text,
  gender text,
  birth_date date,
  anniversary_date date,
  company_name text,
  job_title text,
  website text,
  travel_preferences_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  contact_type text not null,
  contact_value text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_contacts_type_ck check (
    contact_type in ('home', 'cell', 'office', 'whatsapp_primary', 'email')
  )
);

create table if not exists client_addresses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  address_type text not null,
  street_1 text not null,
  street_2 text,
  city text not null,
  state text not null,
  zip_code text not null,
  country text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_addresses_type_ck check (address_type in ('personal', 'office', 'billing'))
);

create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id),
  action text not null,
  resource text not null,
  resource_id uuid,
  before_json jsonb,
  after_json jsonb,
  event_at timestamptz not null default now()
);

create index if not exists idx_leads_status on leads(status);
create index if not exists idx_leads_assigned_agent on leads(assigned_agent_id);
create index if not exists idx_clients_lead_id on clients(lead_id);
create index if not exists idx_client_contacts_client_id on client_contacts(client_id);
create index if not exists idx_client_addresses_client_id on client_addresses(client_id);
create index if not exists idx_audit_events_actor on audit_events(actor_user_id);
create index if not exists idx_audit_events_resource on audit_events(resource, resource_id);

insert into roles (code, name_es_mx, name_en_us)
values
  ('owner', 'Propietario', 'Owner'),
  ('manager', 'Gerente', 'Manager'),
  ('agent', 'Agente', 'Agent'),
  ('accountant', 'Contador', 'Accountant'),
  ('external_dmc', 'Socio Externo DMC', 'External DMC')
on conflict (code) do nothing;

commit;
