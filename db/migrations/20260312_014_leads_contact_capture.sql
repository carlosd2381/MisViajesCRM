begin;

alter table leads
  add column if not exists first_name text,
  add column if not exists paternal_last_name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists preferences text;

create index if not exists idx_leads_email on leads(email);

commit;
