begin;

create table if not exists financial_transactions (
  id text primary key,
  itinerary_id text not null,
  type text not null,
  amount_original numeric(14, 2) not null,
  currency_original char(3) not null,
  exchange_rate numeric(14, 6) not null,
  amount_mxn numeric(14, 2) not null,
  status text not null,
  transaction_date date not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint financial_transactions_type_ck check (type in ('supplier_payment', 'client_receipt', 'service_fee')),
  constraint financial_transactions_currency_ck check (currency_original in ('MXN', 'USD', 'EUR')),
  constraint financial_transactions_status_ck check (status in ('pending', 'cleared', 'cancelled')),
  constraint financial_transactions_amount_original_ck check (amount_original >= 0),
  constraint financial_transactions_exchange_rate_ck check (exchange_rate > 0),
  constraint financial_transactions_amount_mxn_ck check (amount_mxn >= 0)
);

create index if not exists idx_financial_transactions_itinerary on financial_transactions(itinerary_id);
create index if not exists idx_financial_transactions_type on financial_transactions(type);
create index if not exists idx_financial_transactions_status on financial_transactions(status);
create index if not exists idx_financial_transactions_date on financial_transactions(transaction_date);

commit;
