begin;

alter table leads
  add column if not exists urgency_timeframe text,
  add column if not exists trip_occasion text,
  add column if not exists campaign_id text,
  add column if not exists referral_name text,
  add column if not exists assigned_agent_name text,
  add column if not exists last_contact_date date,
  add column if not exists probability_of_sale integer,
  add column if not exists lead_temperature text,
  add column if not exists date_flexibility text,
  add column if not exists preferred_contact_method text;

alter table leads
  drop constraint if exists leads_probability_of_sale_ck;

alter table leads
  add constraint leads_probability_of_sale_ck check (
    probability_of_sale between 0 and 100 or probability_of_sale is null
  );

create index if not exists idx_leads_campaign_id on leads(campaign_id);
create index if not exists idx_leads_last_contact_date on leads(last_contact_date);

commit;
