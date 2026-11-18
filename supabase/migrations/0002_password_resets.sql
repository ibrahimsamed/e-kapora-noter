-- Şifre sıfırlama jetonları. Düz jeton asla saklanmaz; yalnızca SHA-256 özeti tutulur.
create table if not exists password_resets (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null references users(id) on delete cascade,
  token_hash  text not null unique,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  used_at     timestamptz
);
create index if not exists password_resets_user_idx on password_resets (user_id, created_at desc);
alter table password_resets enable row level security; -- politika yok: yalnızca service_role
