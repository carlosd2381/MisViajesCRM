begin;

-- 1) Extend itinerary statuses for proposal feedback loop
alter table itineraries drop constraint if exists itineraries_status_ck;
alter table itineraries add constraint itineraries_status_ck check (
  status in ('draft', 'sent', 'revised', 'accepted', 'paid', 'completed', 'cancelled')
);

-- 2) Pipeline transition audit log
create table if not exists itinerary_status_events (
  id uuid primary key,
  itinerary_id uuid not null references itineraries(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by text,
  changed_at timestamptz not null,
  notes text,
  constraint itinerary_status_events_status_ck check (
    coalesce(from_status, to_status) in ('draft', 'sent', 'revised', 'accepted', 'paid', 'completed', 'cancelled')
    and to_status in ('draft', 'sent', 'revised', 'accepted', 'paid', 'completed', 'cancelled')
  )
);

create index if not exists idx_itinerary_status_events_itinerary on itinerary_status_events(itinerary_id);
create index if not exists idx_itinerary_status_events_changed_at on itinerary_status_events(changed_at desc);

-- 3) Day-by-day structure
create table if not exists itinerary_days (
  id uuid primary key,
  itinerary_id uuid not null references itineraries(id) on delete cascade,
  day_index integer not null,
  day_date date,
  title text not null,
  summary text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint itinerary_days_day_index_ck check (day_index >= 1),
  constraint itinerary_days_unique_index unique (itinerary_id, day_index)
);

create index if not exists idx_itinerary_days_itinerary on itinerary_days(itinerary_id);

create table if not exists itinerary_day_activities (
  id uuid primary key,
  itinerary_id uuid not null references itineraries(id) on delete cascade,
  itinerary_day_id uuid not null references itinerary_days(id) on delete cascade,
  activity_index integer not null,
  title text not null,
  category text not null,
  description_es text,
  description_en text,
  starts_at_local text,
  duration_minutes integer,
  price_net numeric(14, 2) not null default 0,
  price_gross numeric(14, 2) not null default 0,
  optional_enabled boolean not null default false,
  media_url text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint itinerary_day_activities_activity_index_ck check (activity_index >= 1),
  constraint itinerary_day_activities_category_ck check (
    category in ('flight', 'hotel', 'transfer', 'tour', 'dining', 'activity', 'insurance', 'fee', 'other')
  ),
  constraint itinerary_day_activities_unique_index unique (itinerary_day_id, activity_index)
);

create index if not exists idx_itinerary_day_activities_day on itinerary_day_activities(itinerary_day_id);
create index if not exists idx_itinerary_day_activities_itinerary on itinerary_day_activities(itinerary_id);

-- 4) Curated destination library
create table if not exists destination_library (
  id uuid primary key,
  location_name varchar(255) not null,
  category text not null,
  title varchar(255) not null,
  custom_description_es text,
  custom_description_en text,
  high_res_media_url text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint destination_library_category_ck check (category in ('activity', 'hotel', 'dining', 'transfer', 'other'))
);

create index if not exists idx_destination_library_location on destination_library(location_name);
create index if not exists idx_destination_library_category on destination_library(category);
create index if not exists idx_destination_library_active on destination_library(is_active);

-- 5) Public proposal publication + client action events
create table if not exists proposal_publications (
  id uuid primary key,
  itinerary_id uuid not null references itineraries(id) on delete cascade,
  hash text not null unique,
  status text not null,
  published_by text,
  published_at timestamptz not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_viewed_at timestamptz,
  constraint proposal_publications_status_ck check (status in ('active', 'revoked', 'expired'))
);

create index if not exists idx_proposal_publications_itinerary on proposal_publications(itinerary_id);
create index if not exists idx_proposal_publications_hash on proposal_publications(hash);

create table if not exists proposal_action_events (
  id uuid primary key,
  proposal_publication_id uuid not null references proposal_publications(id) on delete cascade,
  itinerary_id uuid not null references itineraries(id) on delete cascade,
  action text not null,
  actor_type text not null,
  actor_ref text,
  message text,
  created_at timestamptz not null,
  constraint proposal_action_events_action_ck check (action in ('approve', 'request_revision', 'open')),
  constraint proposal_action_events_actor_type_ck check (actor_type in ('client', 'agent', 'system'))
);

create index if not exists idx_proposal_action_events_publication on proposal_action_events(proposal_publication_id);
create index if not exists idx_proposal_action_events_itinerary on proposal_action_events(itinerary_id);
create index if not exists idx_proposal_action_events_created_at on proposal_action_events(created_at desc);

commit;
