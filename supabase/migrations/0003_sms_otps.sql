-- SMS doğrulama kodları (kayıt). Düz kod saklanmaz; yalnızca HMAC özeti tutulur.
-- Bekleyen kayıt bilgisi (parola bcrypt özeti olarak) doğrulama tamamlanana kadar burada durur.
create table if not exists sms_otps (
  id          uuid primary key default gen_random_uuid(),
  purpose     text not null check (purpose in ('register')),
  phone       text not null,
  code_hash   text not null,
  payload     jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  attempts    int not null default 0,
  consumed_at timestamptz
);
create index if not exists sms_otps_phone_idx on sms_otps (phone, created_at desc);
alter table sms_otps enable row level security; -- politika yok: yalnızca service_role
