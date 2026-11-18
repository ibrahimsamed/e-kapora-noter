"use client";
import { useState } from "react";
import { Button, Modal } from "./ui";

const SECTIONS: { h: string; p: string[] }[] = [
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
    h: "5. Uyuşmazlık",
    p: [
      "Taraflardan biri hizmetin/teslimatın koşullara uygun olmadığını düşünüyorsa uyuşmazlık bildirebilir. Uyuşmazlık süresince tutar havuzda bekler; otomatik karar verilmez.",
      "Taraflar açıklama ve kanıtlarını sisteme ekler; kanıtlar platform yöneticisi tarafından incelenir ve tutarın kime aktarılacağı bu inceleme sonucunda belirlenir.",
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
];

export function TermsBody() {
  return (
    <div className="space-y-4 text-sm leading-relaxed text-ink">
      {SECTIONS.map((s) => (
        <section key={s.h}>
          <h4 className="font-semibold text-navy">{s.h}</h4>
          {s.p.map((t) => <p key={t} className="mt-1 text-muted">{t}</p>)}
        </section>
      ))}
    </div>
  );
}

export function TermsModal({ open, onClose, onAccept }: { open: boolean; onClose: () => void; onAccept?: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Şartlar ve Koşullar" wide>
      <TermsBody />
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Kapat</Button>
        {onAccept && <Button onClick={() => { onAccept(); onClose(); }}>Okudum, kabul ediyorum</Button>}
      </div>
    </Modal>
  );
}

/** "Şartlar ve koşulları" bağlantısı: tıklayınca metni popup'ta açar. */
export function TermsLink({ onAccept, children = "şartlar ve koşulları" }: { onAccept?: () => void; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="font-semibold text-brand underline" onClick={(e) => { e.preventDefault(); setOpen(true); }}>{children}</button>
      <TermsModal open={open} onClose={() => setOpen(false)} onAccept={onAccept} />
    </>
  );
}
