begin;

create table if not exists communication_logs (
  id text primary key,
  client_id text not null,
  agent_id text,
  channel text not null,
  direction text not null,
  content text not null,
  status text not null,
  metadata_json jsonb,
  thread_id text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint communication_logs_channel_ck check (channel in ('whatsapp', 'email', 'sms', 'internal_note')),
  constraint communication_logs_direction_ck check (direction in ('inbound', 'outbound')),
  constraint communication_logs_status_ck check (status in ('sent', 'delivered', 'read', 'replied'))
);

create index if not exists idx_communication_logs_client on communication_logs(client_id);
create index if not exists idx_communication_logs_thread on communication_logs(thread_id);
create index if not exists idx_communication_logs_channel on communication_logs(channel);

commit;
