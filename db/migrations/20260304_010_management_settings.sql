begin;

create table if not exists management_settings (
  id text primary key,
  key text not null unique,
  value text not null,
  description text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index if not exists idx_management_settings_key on management_settings(key);

commit;