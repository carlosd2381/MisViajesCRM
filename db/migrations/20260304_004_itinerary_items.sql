begin;

create table if not exists itinerary_items (
  id text primary key,
  itinerary_id text not null,
  title text not null,
  category text not null,
  quantity numeric(12, 2) not null,
  unit_net numeric(14, 2) not null,
  unit_gross numeric(14, 2) not null,
  total_net numeric(14, 2) not null,
  total_gross numeric(14, 2) not null,
  service_fee_amount numeric(14, 2) not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint itinerary_items_category_ck check (
    category in ('flight', 'hotel', 'transfer', 'tour', 'insurance', 'fee', 'other')
  ),
  constraint itinerary_items_quantity_ck check (quantity > 0)
);

create index if not exists idx_itinerary_items_itinerary on itinerary_items(itinerary_id);
create index if not exists idx_itinerary_items_category on itinerary_items(category);

commit;
