-- Doğrulama kodları artık e-posta ile de gönderilebilir: kanal ve e-posta kolonları.
alter table sms_otps add column if not exists channel text not null default 'sms' check (channel in ('sms','email'));
alter table sms_otps add column if not exists email text;
create index if not exists sms_otps_email_idx on sms_otps (email, created_at desc);
