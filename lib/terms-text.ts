/** Kullanıcının ödeme anında kabul ettiği şartların metni ve sürümü (sunucu + istemci ortak). */
export const TERMS_VERSION = "2026-11-22.1";

export const TERMS_SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "1. Taraflar ve hizmetin kapsamı",
    p: [
      "e-kapora noter; satıcı ile müşteri arasındaki kapora / ön ödeme tutarının güvenli havuz (escrow) mantığıyla tutulmasını sağlayan dijital bir aracı platformdur. Platform; noter, banka veya finans kuruluşu olarak hareket etmez ve satılan ürün ya da hizmetin tarafı değildir.",
      "Satıcı, işlemi oluştururken ürün/hizmet bilgisini, tutarları ve iptal/iade/teslimat koşullarını eksiksiz ve doğru girmekle; müşteri, işlem detaylarını ödemeden önce okumakla yükümlüdür.",
    ],
  },
  {
    h: "2. İşlemin işleyişi",
    p: [
      "Satıcı işlemi oluşturur ve müşteriye işlem ID'si ile bağlantıyı iletir. Müşteri telefon doğrulamasıyla işlem detaylarına ulaşır ve koşulları kabul ederek ödemeyi yapar.",
      "Ödeme başarılı olduğunda tutar satıcıya değil güvenli havuza aktarılır ve işlem “Güvence Altında” durumuna geçer. Ödeme yapılmadan güvence oluşmaz.",
      "Müşteri ve satıcı, hizmet/teslimat gerçekleştiğinde işlemi ayrı ayrı onaylar. İki taraf da onayladığında kapora, kesintiler düşüldükten sonra satıcının bakiyesine aktarılır. Onaylardan biri eksikse tutar havuzda kalır.",
      "Ödeme yapılmayan işlemler, işlem geçerlilik süresi sonunda kendiliğinden sona erer.",
    ],
  },
  {
    h: "3. Komisyon ve ücretler",
    p: [
      "Platform hizmet bedeli (komisyon) işlem oluşturulurken ve ödeme öncesinde taraflara ayrı ayrı gösterilir. Gösterilen tutarlar, ödeme anında geçerli olan oranlara göre hesaplanır.",
    ],
  },
  {
    h: "4. İptal ve iade",
    p: [
      "İptal ve iade koşulları, satıcının işlem oluştururken belirlediği ve müşterinin ödeme öncesinde gördüğü koşullardır; taraflar bu koşullara bağlıdır.",
      "Müşteri güvence altındaki işlem için iptal/iade talebi oluşturabilir; talep satıcının onayıyla iade sürecine girer. Satıcı da işlemi iptal ederek iade başlatabilir. Satıcı kaynaklı iptallerde kapora ve komisyon bedelinin tamamı müşteriye iade edilir.",
      "İade, ödemenin yapıldığı yönteme platform tarafından başlatılır; bankanın yansıtma süresi platformun kontrolü dışındadır.",
    ],
  },
  {
    h: "5. Uyuşmazlık süreci",
    p: [
      "Taraflardan biri hizmetin/teslimatın koşullara uygun olmadığını düşünüyorsa uyuşmazlık bildirebilir. Uyuşmazlık süresince tutar havuzda bekler; otomatik karar verilmez.",
      "Müzakere: Karşı tarafa bildirim yapılır ve 72 saat içinde yanıt vermesi beklenir. Taraflar sistem üzerinden karşılıklı iade oranı teklif edebilir; teklif kabul edilirse tutar kabul edilen orana göre kısmi olarak dağıtılır.",
      "Platform incelemesi: Anlaşma sağlanamazsa kanıtlar platform yönetimince, en geç 7 iş günü içinde incelenir. Karar; iki ayrı yetkilinin (öneren ve onaylayan) onayıyla, gerekçeli ve yazılı olarak verilir; tam iade, tam aktarım veya oranlı dağıtım olabilir.",
      "İtiraz: Kararın bildiriminden itibaren 3 gün içinde taraflar bir kez itiraz edebilir; itiraz farklı bir yetkili tarafından yeniden incelenir. İtiraz süresi boyunca tutar havuzda bekletilir; itiraz yoksa süre sonunda karar uygulanır.",
      "Mahkeme, icra veya savcılık gibi yetkili makamlardan gelen talepler doğrultusunda işlem üzerinde hukuki blokaj uygulanabilir; blokaj süresince para hareketi yapılmaz.",
    ],
  },
  {
    h: "6. Kayıt, belge ve kişisel veriler",
    p: [
      "İşlemin tüm adımları (oluşturma, ödeme, onay, iptal, iade, uyuşmazlık) tarih ve saat bilgisiyle kayıt altına alınır ve işlem belgesinde (PDF) yer alır. Bu kayıtlar taraflar arasında delil niteliği taşıyabilir.",
      "Ad, telefon, e-posta ve işlem bilgileri yalnızca hizmetin sunulması, güvenliğin sağlanması ve yasal yükümlülüklerin yerine getirilmesi amacıyla, ilgili mevzuata uygun olarak işlenir.",
    ],
  },
  {
    h: "7. Sorumluluk ve yasaklı kullanım",
    p: [
      "Platform, satılan ürün veya hizmetin niteliğinden, satıcı ile müşteri arasındaki ihtilafın esasından sorumlu değildir; yalnızca güvenli tutma ve aktarma hizmetini sunar.",
      "Hukuka aykırı, hileli veya sahte işlemler için platform kullanılamaz. Şüpheli işlemlerde platform, işlemi durdurma ve ilgili makamlara bildirme hakkını saklı tutar.",
    ],
  },
  {
    h: "8. Platform kararının niteliği ve yasal haklar",
    p: [
      "Platformun uyuşmazlık kararı yalnızca havuzdaki tutarın geçici olarak kime aktarılacağını belirler; taraflar arasındaki hukuki uyuşmazlığın nihai çözümü değildir. Taraflar, Tüketici Hakem Heyeti, arabuluculuk ve mahkemeler dahil tüm yasal başvuru haklarını saklı tutar; bu hakların kullanılması hiçbir şekilde sınırlandırılamaz.",
      "Platform kayıtları ile sistem logları, taraflar arasında ispat aracı olarak kabul edilir (delil sözleşmesi). Ödeme anında kabul edilen şartlar, işlem bilgileriyle birlikte değiştirilemez biçimde (SHA-256 özeti ile) saklanır.",
    ],
  },
];
