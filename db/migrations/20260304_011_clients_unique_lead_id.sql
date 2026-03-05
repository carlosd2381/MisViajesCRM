create unique index if not exists clients_lead_id_unique
  on clients (lead_id)
  where lead_id is not null;
