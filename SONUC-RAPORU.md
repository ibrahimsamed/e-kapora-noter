# e-kapora noter — Sonuç Raporu (2026-11-22)

## 1. yapilacaklar.md maddeleri

| # | Madde | Durum | Değişiklik |
|---|-------|-------|-----------|
| 1 | Sorgulama (müşteri) tarafında ödeme ekranında sistem ücretini kaldır | Geri alındı | Komisyon eski mantığa döndü: hem alıcıdan hem satıcıdan hesaplanır, ödeme ekranında sistem ücreti satırı görünür (ücret 0 ise gizlenir) |
| 2 | Güvenli ödeme ekranından "Başarılı kart / Reddedilen kart / Yetersiz bakiye" butonlarını kaldır | Yapıldı | `components/tx-actions.tsx` (buton grubu ve import silindi) |

**Dikkat edilmesi gereken kararlar**
- Demo kart numaraları (4242…) hâlâ sunucuda tek geçerli kart. Butonlar kalktı ama **gerçek kartla ödeme alınamıyor**; canlıya çıkmadan önce gerçek bir sanal POS / ödeme kuruluşu entegrasyonu şart (bkz. 3.1).

## 2. Sistem testi

Not: Projede otomatik test yok ve uygulama doğrudan **canlı Supabase veritabanına** bağlı. Veriyi bozmamak için ödeme/uyuşmazlık akışlarını gerçek DB'ye karşı **çalıştırmadım**; yalnızca statik doğrulama ve kod incelemesi yaptım.

| Kontrol | Sonuç |
|---------|-------|
| `tsc --noEmit` | Temiz, hata yok |
| `next build` | Başarılı, tüm rotalar derlendi |
| `eslint` | 2 hata + 1 uyarı, **ikisi de değişikliklerimden önce vardı**: `app/panel/raporlar/page.tsx:16` ve `components/tx-table.tsx:63` (`<a href="/api/export">` yerine `<Link>` uyarısı; indirme linki olduğu için büyük ihtimalle zararsız), `new-tx-wizard.tsx:30` kullanılmayan `buyerFee` |
| Durum makinesi (`lib/workflow.ts`) | Kod okumasıyla tutarlı: terminal durumlardan çıkış yok, ödeme → güvence → onay → tamamlandı akışı rol kontrollü |
| Ödeme tutarı tutarlılığı | `payTransaction`, `notifyTransfer`, havale onayı aynı formülü (`deposit + buyerFee`) kullanıyor; `buyerFee = 0` ile üçü de tutarlı |

**Çalıştırılmamış, elle test edilmesi gerekenler:** kayıt/giriş/OTP, işlem oluşturma sihirbazı, kartla ödeme ve havale bildirimi, iki taraflı onay, iptal/iade, para çekme, uyuşmazlık, PDF/CSV dışa aktarma. Önerim: ayrı bir Supabase test projesi açıp bu akışlar için Playwright uçtan uca testleri yazmak.

**Tespit edilen sorunlar (uyuşmazlık modülü ile ilgili)**
- `evidenceSize()` dosya boyutunu dosya adından uyduruyor; **gerçek dosya yükleme yok**, "kanıt" yalnızca bir isimden ibaret. Hukuken delil değeri sıfır.
- Admin kararı yalnızca iki uçlu: tamamen iade ya da tamamen satıcıya. Kısmi/pay edilmiş karar yok.
- Uyuşmazlık için süre sınırı (SLA), karşı tarafa cevap süresi, itiraz/yeniden inceleme ve bildirim (SMS/e-posta) yok.
- Karar yalnızca tek bir admin kullanıcısına ait; ikinci göz / çıkar çatışması kontrolü yok.

## 3. Hukuki taraf ve uyuşmazlık karar mekanizması

> Bu bölüm genel bir değerlendirmedir, hukuki görüş değildir. Madde numaralarını ve güncel parasal sınırları canlıya çıkmadan önce bir avukata doğrulatın. Güncel mevzuatı internetten teyit etmedim.

### 3.1 Önce çözülmesi gereken yapısal riskler

1. **Para tutma (emanet/escrow).** Müşterinin parasını kendi hesabınızda tutup satıcıya aktarmak, Türkiye'de ödeme hizmeti sayılabilir (6493 sayılı Kanun). Bu faaliyet lisanslı kuruluş (ödeme/elektronik para kuruluşu veya banka) ister. Şu anki "demo IBAN" modeli canlıda ciddi risk taşır. Çözüm yolları: lisanslı bir ödeme kuruluşunun pazaryeri / alt üye iş yeri ("marketplace", havuz hesabı) ürününü kullanmak ya da lisans almak.
2. **"Noter" adı.** Noterlik kamu hizmetidir (1512 sayılı Noterlik Kanunu). Marka ve metinlerde "noter" geçmesi, resmî noter onayı varmış izlenimi verebilir. Marka ve sloganda "noter" ifadesinden ve resmî bir kurum imasından kaçının; ya da gerçekten noter/arabulucu ile iş birliği yapın.
3. **Aracı hizmet sağlayıcı.** İşlem tarafları arasında alışveriş yapılıyorsa, 6563 sayılı Elektronik Ticaret Kanunu ve ilgili yönetmelik kapsamı (ETAHS) incelenmeli.
4. **Kişisel veri.** KVKK: aydınlatma metni, açık rıza/işleme şartları, VERBİS kaydı, telefon/OTP/IBAN verilerinin saklama süreleri. Kimlik ve para akışı varsa MASAK yükümlülükleri de kontrol edilmeli.

### 3.2 Taraflar anlaşamazsa: önerilen kademeli karar mekanizması

Temel ilke: **platform kararı "para kime serbest bırakılır" kararıdır; taraflar arasındaki hukuki uyuşmazlığın nihai çözümü değildir.** Özellikle tüketici müşteri bakımından, tahkim/bağlayıcı karar şartı geçersiz sayılır (6502 sayılı Tüketicinin Korunması Hakkında Kanun) ve tüketicinin Tüketici Hakem Heyeti ile Tüketici Mahkemesi'ne başvuru hakkı kısıtlanamaz. Bu yüzden şartlarda bunu açıkça yazın: *"Platform kararı yalnızca havuzdaki tutarın geçici dağıtımını belirler; taraflar yasal haklarını saklı tutar."*

**Kademe 0: Önleme (sözleşme yazımı)**
- Satıcı, işlem açarken iptal/iade koşulları, teslim tarihi ve "kapora mı, cayma bedeli mi, ön ödeme mi" olduğunu seçmeli. Bu tür, hukuki sonucu (iade edilebilirlik) belirler.
- Onaylanan şartlar ve ödeme anındaki sürüm değiştirilemez şekilde saklanmalı (hash'li PDF). Delil sözleşmesi hükmü (HMK m.193) şartlara eklenmeli: sistem logları ve kayıtları taraflar arasında delil sayılır.

**Kademe 1: Müzakere (3 iş günü)**
- Uyuşmazlık açılınca karşı tarafa SMS/e-posta ile bildirim ve cevap süresi (ör. 72 saat).
- Taraflar sistem içinde karşılıklı teklif verebilir (ör. %50 iade). Teklif kabul edilirse otomatik **kısmi** dağıtım.
- Cevap verilmezse varsayılan kural: süre sonunda yalnızca bir taraf delil sunmuşsa ve ilgili şart açıksa, yine de otomatik karar yerine Kademe 2'ye geçilmeli (kör otomasyon yasal risk taşır).

**Kademe 2: Platform incelemesi (en fazla 7 iş günü)**
- İki farklı yetkili (dört göz): inceleyen ile onaylayan aynı kişi olmasın.
- Karar kriterleri önceden ve açıkça yazılı olmalı: işlem şartları, teslim/hizmet kanıtı, yazışma, mesafeli satış mevzuatı (cayma hakkı ve istisnaları), satıcının iptali mi müşterinin iptali mi olduğu.
- Karar seçenekleri: tam iade, tam aktarım, **oranlı dağıtım**, ek bilgi talebi.
- Karar gerekçeli yazılı verilir ve iki tarafa bildirilir.

**Kademe 3: İtiraz (kararın bildiriminden itibaren 3 gün)**
- Farklı bir yetkili tarafından yeniden inceleme. Bu süre içinde para **bekletilir**; itiraz yoksa süre dolunca karar uygulanır.

**Kademe 4: Dış çözüm (kararı beklemeden yönlendirme)**
- Arabuluculuk (ticari taraflar arasında 6325 sayılı Kanun'a göre ticari uyuşmazlıklarda dava şartı olabilir; tüketici uyuşmazlıklarında genellikle dava şartı değildir, doğrulayın).
- Tüketici için: Tüketici Hakem Heyeti (parasal sınırın altında) veya Tüketici Mahkemesi.
- Kullanıcılar arası ticari ilişkide: anlaşmaya bağlı kurumsal tahkim (yalnızca tüketici olmayan taraflar için geçerli) veya ticaret mahkemesi.
- Mahkeme kararı/ihtiyati tedbir ya da icra müdürlüğü yazısı gelirse, havuzdaki tutar buna göre dondurulur ya da aktarılır; sistem bunu bir "hukuki blokaj" durumu olarak desteklemeli.

### 3.3 Tipik senaryolar için varsayılan kurallar (taslak)

| Senaryo | Öneri |
|---------|-------|
| Satıcı hizmeti/ürünü teslim etmedi, müşteri iptal etti | Tam iade |
| Müşteri hizmet verildikten/teslim sonrası "vazgeçtim" dedi | Şartlarda belirtilen iptal politikasına göre; kapora cayma bedeli ise satıcıya |
| Müşteri hiç gelmedi / tarafından cevap yok | Satıcı itirazı ve kanıtıyla süre sonunda satıcıya, ancak Kademe 3 itiraz süresi sonrası |
| Ürün/hizmet kusurlu | Tüketici ise kusurlu mal hükümleri (seçimlik haklar); oranlı dağıtım |
| Dolandırıcılık şüphesi | Tutar blokede kalır, MASAK/suç duyurusu süreci için hukuki danışmanlık |
| Taraflardan biri kimlik/telefon doğrulamasında şüpheli | İşlem durdurulur, ek doğrulama |

### 3.4 Sisteme eklenmesi gereken teknik işler (öncelik sırasıyla)

1. **Gerçek dosya yükleme** (Supabase Storage), dosya hash'i ve zaman damgası ile; kanıt boyutunu uydurma kodunu kaldırma.
2. `DISPUTED` durumundan **kısmi iade / oranlı dağıtım** (`refundBuyer` + `releaseToSeller` kombinasyonu, ledger kaydı ile).
3. Uyuşmazlık için süre alanları (`respondBy`, `decideBy`, `appealUntil`) ve zamanlanmış kontrol (cron).
4. Karar öncesi iki kişilik onay (`reviewerId` ≠ `approverId`), ve itiraz durumu (`APPEAL`).
5. SMS/e-posta bildirimleri (`lib/sms.ts`, `lib/mail.ts` zaten var, uyuşmazlık olaylarına bağlanmalı).
6. Kabul edilen şartların sürümlenmesi ve ödeme anındaki PDF'in değiştirilemez saklanması (`lib/pdf.ts`).
7. "Hukuki blokaj" durumu (mahkeme/icra talepleri için).
8. Şartlar sayfasında (`components/terms.tsx`) uyuşmazlık sürecinin ve yukarıdaki "platform kararı hakları saklı tutar" ifadesinin yer alması.

### 3.5 Canlıya çıkmadan önce avukata sorulacaklar
- Bu model ödeme hizmeti sayılıyor mu, hangi lisans/iş birliği gerekli?
- Kapora/cayma bedeli/ön ödeme ayrımı ve iade edilebilirlik.
- Tüketici ve ticari taraf için ayrı şart setleri gerekli mi?
- "Noter" ifadesinin kullanımı.
- KVKK, VERBİS, MASAK, Ticaret Bakanlığı (ETAHS) yükümlülükleri.
- Parasal sınırlar (Tüketici Hakem Heyeti, ödeme limitleri) için güncel rakamlar.

## 4. Uygulama durumu (2026-11-22, ikinci tur)

Raporun kod ile çözülebilen tüm maddeleri uygulandı. Hukuki/operasyonel maddeler kod ile çözülemez; aşağıda ayrıca işaretli.

### 4.1 Teknik işler (3.4)

| # | Madde | Durum | Nerede |
|---|-------|-------|--------|
| 1 | Gerçek dosya yükleme, SHA-256, uydurma boyutun kaldırılması | Yapıldı | `app/api/upload/route.ts` (8 MB, tür beyaz listesi, özel depo), `app/api/evidence/route.ts` (60 sn imzalı bağlantı, yalnızca taraflar/admin), `components/tx-actions.tsx` |
| 2 | Kısmi iade / oranlı dağıtım | Yapıldı | `distribute()` in `lib/services.ts`; komisyon yalnızca satıcıya aktarılan pay oranında kesilir, defter dengesi korunur |
| 3 | Süre alanları (yanıt 72 saat, karar 7 iş günü, itiraz 3 gün) ve otomatik uygulama | Yapıldı | `respondBy`, `decideBy`, `appealUntil`; itiraz süresi dolan karar `sweepExpired()` ile uygulanır |
| 4 | Çift onay ve itiraz durumu | Yapıldı | `resolveDispute` (öneri) → `approveDispute` (ikinci yönetici) → `appealDispute` (taraf, tek sefer) → farklı yönetici nihai karar |
| 5 | Bildirimler | Yapıldı | `notifyDispute()` SMS/e-posta (kullanıcının bildirim tercihine göre; hata işlemi bozmaz) |
| 6 | Kabul edilen şartların sürümlenmesi | Yapıldı | `lib/terms-text.ts` (sürüm), ödeme anında `termsSnapshot` (SHA-256), PDF'e yazılır, veritabanı tetikleyicisi sonradan değişikliği engeller |
| 7 | Hukuki blokaj | Yapıldı | `placeLegalHold` / `liftLegalHold`; blokajlı işlemde onay, iade, karar uygulaması durur |
| 8 | Şartlar metni | Yapıldı | `lib/terms-text.ts` bölüm 5 ve yeni bölüm 8 ("platform kararı yasal hakları saklı tutar", delil sözleşmesi) |

Ek olarak: teklif/karşı teklif ile müzakere (kabul edilirse platform kararı gerekmeden dağıtım), tarafların uyuşmazlık paneli (`components/dispute-panel.tsx`), admin karar formu (oranlı dağıtım, onay/iade), liste ve sayfalarda SLA aşımı göstergesi, açılış sayfası alt bilgisine "noterlik kurumu değildir / yasal haklar saklıdır" uyarısı.

### 4.2 Tasarım kararları
- **Tek yönetici varsa:** çift onay uygulanamaz; öneri otomatik onaylanır ve denetim kaydına "Tek yönetici hesabı" notu düşülür. Gerçek çift onay için en az 2 aktif admin hesabı gerekir; itiraz aşamasında da farklı yönetici aranır, yoksa aynı kişiye izin verilir.
- **Süreler:** iş günü hesabı yalnızca hafta sonlarını atlar; resmî tatiller hesaba katılmaz.
- **Cevap vermeyen taraf:** otomatik karar verilmez (rapordaki "kör otomasyon" uyarısı); süre aşımı yöneticiye "SLA aşıldı" olarak görünür.
- **Zamanlayıcı yok:** itiraz süresi dolan kararlar bir sonraki sayfa okumasında uygulanır (mevcut `sweepExpired` mekanizması). Hiç trafik olmazsa gecikebilir; kesin zamanlama için Vercel Cron vb. ile `sweepExpired` çağrılmalı.

### 4.3 Doğrulama
- `tsc` temiz, `eslint` 0 hata / 0 uyarı (önceden var olan 2 hata + 1 uyarı da giderildi), `next build` başarılı.
- Para ve süreç mantığı için 12 senaryoluk test çalıştırıldı (hepsi geçti): teklif→kabul %40 iade (iade 42.000 / satıcı 57.000 / komisyon 6.000 kuruş, havuz sıfır), teklif reddi, çift onay ihlali, iade edilen öneri, itiraz süresi dolmadan uygulamama, süre sonunda otomatik uygulama, tek itiraz hakkı, itiraz sonrası farklı yönetici ve nihai tam iade, süresi dolmuş itiraz, tek yönetici otomatik onay, hukuki blokajda onay/iade/karar engeli ve kaldırma, başka işlem yoluna ait kanıtın reddi, yetki kontrolleri. Test, veritabanı yerine bellek içi sahte istemci kullandı; canlı veriye dokunmadı. Test dosyası projeye eklenmedi.
- **Çalıştırılmadı:** gerçek Supabase ile migration, dosya yükleme/indirme (Storage), SMS/e-posta gönderimi ve tarayıcıdaki arayüz akışları.

### 4.4 Canlıya almadan önce yapılması gerekenler
1. **`supabase/migrations/0005_dispute_legal.sql` dosyasını veritabanında çalıştırın; kodu bundan önce yayına almayın.** Yeni kolonları, durum kısıtını, `apply_changes` fonksiyonunu, şart snapshot tetikleyicisini ve `evidence` özel depo alanını oluşturur.
2. En az iki aktif yönetici hesabı açın (gerçek çift onay için).
3. SMS (`NETGSM_*`) ve e-posta (`SMTP_*`) ortam değişkenlerini tanımlayın; aksi halde bildirimler yalnızca geliştirme günlüğüne yazılır, üretimde gönderilemez ve sessizce atlanır.
4. İtiraz süresi dolan kararların zamanında uygulanması için periyodik tetikleme ekleyin.

### 4.5 Kod ile çözülemeyen maddeler (açık)
- Ödeme hizmeti lisansı / lisanslı ödeme kuruluşu entegrasyonu ve gerçek sanal POS (3.1-1).
- "Noter" markası kararı (3.1-2); yalnızca uyarı metni eklendi, ad değiştirilmedi.
- ETAHS, KVKK/VERBİS, MASAK yükümlülükleri (3.1-3, 3.1-4).
- 3.5'teki avukat soruları ve güncel parasal sınırlar.

