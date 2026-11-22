-- Uyuşmazlık süreci (müzakere, çift onay, itiraz, SLA), hukuki blokaj, şart sürümleme ve delil depolama.
-- UYGULAMA KODUNU DEPLOY ETMEDEN ÖNCE bu migration çalıştırılmalıdır.

alter table disputes
  add column if not exists respond_by   timestamptz,
  add column if not exists decide_by    timestamptz,
  add column if not exists appeal_until timestamptz,
  add column if not exists offers       jsonb not null default '[]',
  add column if not exists proposal     jsonb,
  add column if not exists approval     jsonb,
  add column if not exists appeal       jsonb;

alter table disputes drop constraint if exists disputes_status_check;
alter table disputes add constraint disputes_status_check
  check (status in ('OPEN','UNDER_REVIEW','DECIDED','APPEAL','RESOLVED'));

alter table transactions
  add column if not exists legal_hold     jsonb,
  add column if not exists terms_snapshot jsonb;

-- Kabul edilen şart snapshot'ı bir kez yazıldıktan sonra değiştirilemez.
create or replace function forbid_terms_change() returns trigger language plpgsql as $$
begin
  if old.terms_snapshot is not null and new.terms_snapshot is distinct from old.terms_snapshot then
    raise exception 'terms_snapshot değiştirilemez';
  end if;
  return new;
end $$;
drop trigger if exists terms_snapshot_immutable on transactions;
create trigger terms_snapshot_immutable before update on transactions
  for each row execute function forbid_terms_change();

-- Delil dosyaları için özel (private) depolama alanı.
insert into storage.buckets (id, name, public) values ('evidence', 'evidence', false)
  on conflict (id) do nothing;

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
      close_reason=excluded.close_reason, events=excluded.events, documents=excluded.documents,
      legal_hold=excluded.legal_hold, terms_snapshot=excluded.terms_snapshot;

  insert into payments select * from jsonb_populate_recordset(null::payments, coalesce(p->'upsert'->'payments','[]'))
    on conflict (id) do nothing;

  insert into withdrawals select * from jsonb_populate_recordset(null::withdrawals, coalesce(p->'upsert'->'withdrawals','[]'))
    on conflict (id) do update set status=excluded.status, decided_at=excluded.decided_at, admin_note=excluded.admin_note;

  insert into ledger select * from jsonb_populate_recordset(null::ledger, coalesce(p->'upsert'->'ledger','[]'))
    on conflict (id) do nothing;

  insert into disputes select * from jsonb_populate_recordset(null::disputes, coalesce(p->'upsert'->'disputes','[]'))
    on conflict (id) do update set
      status=excluded.status, statements=excluded.statements, evidence=excluded.evidence,
      resolution=excluded.resolution, review_notes=excluded.review_notes,
      respond_by=excluded.respond_by, decide_by=excluded.decide_by, appeal_until=excluded.appeal_until,
      offers=excluded.offers, proposal=excluded.proposal, approval=excluded.approval, appeal=excluded.appeal;

  insert into audit select * from jsonb_populate_recordset(null::audit, coalesce(p->'upsert'->'audit','[]'))
    on conflict (id) do nothing;
end $$;

revoke all on function apply_changes(jsonb) from public, anon, authenticated;
grant execute on function apply_changes(jsonb) to service_role;
