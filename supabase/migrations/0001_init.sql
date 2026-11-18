-- e-kapora noter: ilk şema
-- Tüm tutarlar tamsayı kuruş (bigint). Erişim yalnızca sunucudan service_role ile yapılır;
-- RLS açık ve politika tanımsız olduğundan anon/authenticated roller hiçbir veriye erişemez.

create table if not exists meta (
  id          int primary key default 1 check (id = 1),
  seq         bigint not null default 100,
  id_seq      bigint not null default 1
);
insert into meta (id) values (1) on conflict do nothing;

create table if not exists settings (
  id               int primary key default 1 check (id = 1),
  buyer_fee_bps    int    not null default 200 check (buyer_fee_bps  between 0 and 10000),
  seller_fee_bps   int    not null default 200 check (seller_fee_bps between 0 and 10000),
  min_withdrawal   bigint not null default 10000 check (min_withdrawal >= 0)
);
insert into settings (id) values (1) on conflict do nothing;

create table if not exists users (
  id             text primary key,
  role           text not null check (role in ('CUSTOMER','SELLER','ADMIN')),
  name           text not null,
  business_name  text,
  email          text,
  phone          text not null,
  password_hash  text,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  city           text,
  bank_name      text,
  iban           text,
  notif          jsonb not null default '{"sms":true,"email":true,"whatsapp":false}'
);
create unique index if not exists users_email_uq on users (lower(email)) where email is not null;
create unique index if not exists users_role_phone_uq on users (role, phone);

create table if not exists transactions (
  id                  text primary key,
  seller_id           text not null references users(id),
  customer_id         text not null references users(id),
  category            text not null,
  title               text not null,
  description         text not null default '',
  total_amount        bigint not null check (total_amount > 0),
  deposit             bigint not null check (deposit > 0 and deposit <= total_amount),
  buyer_fee_bps       int not null,
  seller_fee_bps      int not null,
  buyer_fee           bigint not null,
  seller_fee          bigint not null,
  service_date        text not null default '',
  valid_until         timestamptz not null,
  cancel_policy       text not null default '',
  refund_policy       text not null default '',
  delivery_terms      text not null default '',
  extra_notes         text not null default '',
  status              text not null check (status in (
    'CREATED','WAITING_FOR_PAYMENT','PAYMENT_PROCESSING','SECURED','WAITING_FOR_CONFIRMATION',
    'COMPLETED','CANCELLATION_REQUESTED','REFUND_PROCESSING','REFUNDED','DISPUTED','EXPIRED','CANCELLED')),
  prev_status         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  secured_at          timestamptz,
  buyer_confirmed_at  timestamptz,
  seller_confirmed_at timestamptz,
  completed_at        timestamptz,
  cancel_request      jsonb,
  refund              jsonb,
  close_reason        text,
  events              jsonb not null default '[]',
  documents           jsonb not null default '[]'
);
create index if not exists tx_seller_idx   on transactions (seller_id, created_at desc);
create index if not exists tx_customer_idx on transactions (customer_id, created_at desc);
create index if not exists tx_status_idx   on transactions (status);

create table if not exists payments (
  id           text primary key,
  tx_id        text not null references transactions(id),
  amount       bigint not null check (amount > 0),
  card_last4   text not null,
  status       text not null check (status in ('SUCCESS','FAILED')),
  fail_reason  text,
  at           timestamptz not null default now(),
  idem_key     text not null
);
create unique index if not exists payments_idem_uq on payments (tx_id, idem_key);

create table if not exists withdrawals (
  id          text primary key,
  seller_id   text not null references users(id),
  amount      bigint not null check (amount > 0),
  bank_name   text not null,
  iban        text not null,
  status      text not null check (status in ('PENDING','APPROVED','REJECTED')),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz,
  admin_note  text
);
create index if not exists wd_seller_idx on withdrawals (seller_id, created_at desc);

-- Ledger değiştirilemez (append-only): bakiyeler yalnızca buradan hesaplanır.
create table if not exists ledger (
  id             text primary key,
  at             timestamptz not null default now(),
  kind           text not null check (kind in (
    'PAYMENT','RELEASE_SELLER','COMMISSION','REFUND','WITHDRAWAL_HOLD','WITHDRAWAL_PAID','WITHDRAWAL_RELEASE')),
  amount         bigint not null check (amount > 0),
  tx_id          text references transactions(id),
  seller_id      text references users(id),
  customer_id    text references users(id),
  withdrawal_id  text references withdrawals(id),
  note           text not null default ''
);
create index if not exists ledger_seller_idx on ledger (seller_id);
create index if not exists ledger_tx_idx     on ledger (tx_id);

create table if not exists disputes (
  id           text primary key,
  tx_id        text not null references transactions(id),
  opened_by    text not null,
  opened_at    timestamptz not null default now(),
  reason       text not null,
  status       text not null check (status in ('OPEN','UNDER_REVIEW','RESOLVED')),
  statements   jsonb not null default '[]',
  evidence     jsonb not null default '[]',
  resolution   jsonb,
  review_notes jsonb not null default '[]'
);
create index if not exists disputes_tx_idx on disputes (tx_id);

create table if not exists audit (
  id           text primary key,
  at           timestamptz not null default now(),
  actor_id     text not null,
  actor_role   text not null,
  action       text not null,
  entity_id    text not null,
  detail       text not null default ''
);
create index if not exists audit_entity_idx on audit (entity_id, at desc);

-- Ledger ve audit güncellenemez / silinemez.
create or replace function forbid_change() returns trigger language plpgsql as $$
begin raise exception '% tablosu değiştirilemez', tg_table_name; end $$;
drop trigger if exists ledger_immutable on ledger;
create trigger ledger_immutable before update or delete on ledger for each row execute function forbid_change();
drop trigger if exists audit_immutable on audit;
create trigger audit_immutable before update or delete on audit for each row execute function forbid_change();

-- RLS: açık, politika yok => yalnızca service_role erişir.
alter table meta         enable row level security;
alter table settings     enable row level security;
alter table users        enable row level security;
alter table transactions enable row level security;
alter table payments     enable row level security;
alter table withdrawals  enable row level security;
alter table ledger       enable row level security;
alter table disputes     enable row level security;
alter table audit        enable row level security;

-- Aynı anda tek yazıcı: servis katmanı değişiklikleri bu fonksiyonla tek transaction'da uygular.
-- p jsonb = { meta, settings, upsert: {tablo: [satır,...]}, expected_seq }
-- İyimser kilit: meta.seq beklenen değerle eşleşmezse işlem reddedilir (serializable davranış).
create or replace function apply_changes(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  cur bigint;
begin
  perform pg_advisory_xact_lock(7001);
  select seq into cur from meta where id = 1 for update;
  if cur is distinct from (p->>'expected_seq')::bigint then
    raise exception 'CONFLICT' using errcode = '40001';
  end if;

  update meta set seq = cur + 1, id_seq = (p->'meta'->>'id_seq')::bigint where id = 1;
  update settings set
    buyer_fee_bps  = (p->'settings'->>'buyer_fee_bps')::int,
    seller_fee_bps = (p->'settings'->>'seller_fee_bps')::int,
    min_withdrawal = (p->'settings'->>'min_withdrawal')::bigint
  where id = 1;

  -- Sıra, yabancı anahtar bağımlılıklarına göre.
  insert into users select * from jsonb_populate_recordset(null::users, coalesce(p->'upsert'->'users','[]'))
    on conflict (id) do update set
      role=excluded.role, name=excluded.name, business_name=excluded.business_name, email=excluded.email,
      phone=excluded.phone, password_hash=excluded.password_hash, active=excluded.active, city=excluded.city,
      bank_name=excluded.bank_name, iban=excluded.iban, notif=excluded.notif;

  insert into transactions select * from jsonb_populate_recordset(null::transactions, coalesce(p->'upsert'->'transactions','[]'))
    on conflict (id) do update set
      category=excluded.category, title=excluded.title, description=excluded.description,
      total_amount=excluded.total_amount, deposit=excluded.deposit, buyer_fee=excluded.buyer_fee,
      seller_fee=excluded.seller_fee, service_date=excluded.service_date, valid_until=excluded.valid_until,
      cancel_policy=excluded.cancel_policy, refund_policy=excluded.refund_policy,
      delivery_terms=excluded.delivery_terms, extra_notes=excluded.extra_notes, status=excluded.status,
      prev_status=excluded.prev_status, updated_at=excluded.updated_at, secured_at=excluded.secured_at,
      buyer_confirmed_at=excluded.buyer_confirmed_at, seller_confirmed_at=excluded.seller_confirmed_at,
      completed_at=excluded.completed_at, cancel_request=excluded.cancel_request, refund=excluded.refund,
      close_reason=excluded.close_reason, events=excluded.events, documents=excluded.documents;

  insert into payments select * from jsonb_populate_recordset(null::payments, coalesce(p->'upsert'->'payments','[]'))
    on conflict (id) do nothing;

  insert into withdrawals select * from jsonb_populate_recordset(null::withdrawals, coalesce(p->'upsert'->'withdrawals','[]'))
    on conflict (id) do update set status=excluded.status, decided_at=excluded.decided_at, admin_note=excluded.admin_note;

  insert into ledger select * from jsonb_populate_recordset(null::ledger, coalesce(p->'upsert'->'ledger','[]'))
    on conflict (id) do nothing;

  insert into disputes select * from jsonb_populate_recordset(null::disputes, coalesce(p->'upsert'->'disputes','[]'))
    on conflict (id) do update set
      status=excluded.status, statements=excluded.statements, evidence=excluded.evidence,
      resolution=excluded.resolution, review_notes=excluded.review_notes;

  insert into audit select * from jsonb_populate_recordset(null::audit, coalesce(p->'upsert'->'audit','[]'))
    on conflict (id) do nothing;
end $$;

revoke all on function apply_changes(jsonb) from public, anon, authenticated;
grant execute on function apply_changes(jsonb) to service_role;
