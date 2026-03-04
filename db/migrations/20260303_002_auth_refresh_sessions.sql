begin;

create table if not exists auth_refresh_sessions (
  token_hash text primary key,
  user_id text not null,
  role text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint auth_refresh_sessions_role_ck check (
    role in ('owner', 'manager', 'agent', 'accountant', 'external_dmc')
  )
);

create index if not exists idx_auth_refresh_sessions_user on auth_refresh_sessions(user_id);
create index if not exists idx_auth_refresh_sessions_expires on auth_refresh_sessions(expires_at);
create index if not exists idx_auth_refresh_sessions_revoked on auth_refresh_sessions(revoked_at);

commit;
