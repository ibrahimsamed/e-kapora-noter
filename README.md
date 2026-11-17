# e-kapora noter (DEMO)

Kapora dolandırıcılığına karşı alıcı–satıcı ödemelerini "güvenli havuz" mantığıyla simüle eden FinTech demo platformu.
**Gerçek para, banka, kart veya ödeme entegrasyonu yoktur; her şey simülasyondur.**

## Teknoloji
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Recharts · Lucide · jsPDF · Zod.
shadcn/ui yerine aynı yaklaşımda elle yazılmış bileşenler (`components/ui.tsx`) kullanılmıştır.

**Veri katmanı:** `lib/data.ts` — sunucu belleği + `data/db.json` dosyası. `mutate()` atomik çalışır (hata olursa hiçbir değişiklik uygulanmaz).
Prisma/PostgreSQL yerine bu seçim, sıfır kurulumla çalışması içindir; üretimde yalnızca bu katman değiştirilecek şekilde izole edilmiştir.
Dosya tabanlı depo serverless (Vercel vb.) ortamlarda kalıcı değildir.

## Kurulum
```bash
npm install
cp .env.example .env     # SESSION_SECRET değerini değiştirin
npm run dev              # http://localhost:3000
```
İlk açılışta demo verisi (10 satıcı, 25 müşteri, 50 işlem…) otomatik üretilir. Sıfırlamak için `data/` klasörünü silin.

## Demo hesaplar
| Rol | Giriş | Parola |
|---|---|---|
| Admin | admin@ekapora.demo | Admin1234! |
| Satıcı | abc-organizasyon@ekapora.demo (ABC Organizasyon) | Demo1234! |
| Satıcı | ankara-premium-villa@ekapora.demo | Demo1234! |
| Satıcı | istanbul-oto-galeri@ekapora.demo | Demo1234! |
| Satıcı | ege-tatil-evleri@ekapora.demo | Demo1234! |
| Satıcı | teknoloji-market@ekapora.demo | Demo1234! |
| Satıcı | antalya-resort-otel / premium-rent-a-car / kapadokya-konaklama / anadolu-dugun-sarayi / pro-servis @ekapora.demo | Demo1234! |
| Müşteri | `/musteri/giris` → telefon 0555 000 00 01 … 0555 000 00 25 | OTP kodu: 123456 |

Demo kartlar: `4242 4242 4242 4242` (başarılı) · `4000 0000 0000 0002` (reddedilir) · `4000 0000 0000 9995` (yetersiz bakiye). Başka kart numaraları reddedilir ve saklanmaz.
Demo IBAN biçimi: `TR` + 24 rakam (örn. `TR000000000000000000000001`).

## Mimari özet
- `lib/workflow.ts` — 12 durumlu merkezi durum makinesi (etiket, renk, izinli geçişler, yetkili roller).
- `lib/services.ts` — tüm iş kuralları; RBAC, Zod doğrulama, idempotency, audit log.
- `lib/balances.ts` — bakiyeler yalnızca ledger'dan hesaplanır; tutarlar tamsayı kuruş.
- `app/api/action`, `app/api/auth` — tek yetkilendirme noktası; sayfalar `requireRole()` ile korunur.
- Komisyon (varsayılan %2 + %2) işlem tamamlanınca gelir olur; iade edilen işlemde komisyon alınmaz, müşteriye ödediği tutarın tamamı döner.

## Akış
Satıcı işlem oluşturur → müşteri OTP ile girer, demo kartla öder (SECURED) → iki taraf ayrı ayrı onaylar (COMPLETED, tutar satıcı bakiyesine) · iptal talebi → satıcı onayı → iade · itiraz → DISPUTED → admin kararı (iade / satıcıya aktar / ek inceleme) · satıcı çekim talebi → admin onay/ret.
