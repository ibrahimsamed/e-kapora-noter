import bcrypt from "bcryptjs";
import { mutate, getDb, suspendPersist, flush } from "./data";
import { setNow, now } from "./clock";
import { CANCEL_POLICIES } from "./workflow";
import { sellerBalances } from "./balances";
import {
  addDisputeStatement,
  cancelUnpaid,
  confirmTransaction,
  createTransaction,
  decideWithdrawal,
  DEMO_CARDS,
  openDispute,
  payTransaction,
  processRefund,
  requestCancel,
  requestWithdrawal,
  respondCancel,
  sweepExpired,
} from "./services";
import type { Actor, Category, User } from "./types";

export const DEMO_SELLER_PASSWORD = "Demo1234!";
export const DEMO_ADMIN = { email: "admin@ekapora.demo", password: "Admin1234!" };

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SellerSeed {
  slug: string;
  business: string;
  owner: string;
  city: string;
  category: Category;
  items: { title: string; desc: string; total: number; pct: number }[];
}

export const SELLERS: SellerSeed[] = [
  { slug: "abc-organizasyon", business: "ABC Organizasyon", owner: "Kemal Aydın", city: "İstanbul", category: "EVENT", items: [
    { title: "Düğün salonu rezervasyonu", desc: "300 kişilik düğün salonu, ikram ve ses-ışık sistemi dahil tek gün kullanım.", total: 25000, pct: 40 },
    { title: "Nişan organizasyonu", desc: "120 kişilik nişan organizasyonu; dekor, catering ve fotoğraf çekimi dahil.", total: 18000, pct: 30 },
  ] },
  { slug: "ankara-premium-villa", business: "Ankara Premium Villa", owner: "Selin Karaca", city: "Ankara", category: "VILLA_RENTAL", items: [
    { title: "Havuzlu villa kiralama (hafta sonu)", desc: "4+1 havuzlu villa, 2 gece konaklama, 10 kişi kapasiteli.", total: 15000, pct: 30 },
    { title: "Bahçeli villa haftalık kiralama", desc: "Bahçeli 3+1 villa, 7 gece konaklama.", total: 32000, pct: 25 },
  ] },
  { slug: "istanbul-oto-galeri", business: "İstanbul Oto Galeri", owner: "Murat Şahin", city: "İstanbul", category: "VEHICLE_SALE", items: [
    { title: "2021 model sedan araç kaporası", desc: "2021 model, 38.000 km, hasar kaydı yok. Kapora ile araç ayrılır.", total: 850000, pct: 6 },
    { title: "2019 model SUV araç kaporası", desc: "2019 model dizel SUV, 72.000 km, tam bakımlı.", total: 1250000, pct: 4 },
  ] },
  { slug: "ege-tatil-evleri", business: "Ege Tatil Evleri", owner: "Derya Öztürk", city: "Çeşme", category: "VILLA_RENTAL", items: [
    { title: "Yazlık ev kiralama (7 gece)", desc: "Denize 200 m, 3+1 yazlık, klima ve otopark dahil.", total: 42000, pct: 25 },
    { title: "Taş ev hafta sonu kiralama", desc: "Alaçatı'da restore edilmiş taş ev, 2 gece.", total: 12000, pct: 35 },
  ] },
  { slug: "teknoloji-market", business: "Teknoloji Market", owner: "Onur Efe", city: "İzmir", category: "PRODUCT", items: [
    { title: "Dizüstü bilgisayar ön ödeme", desc: "Sıfır, faturalı, 2 yıl garantili dizüstü bilgisayar.", total: 38000, pct: 15 },
    { title: "Akıllı telefon kaporası", desc: "Yeni sezon akıllı telefon, stok ayırma kaporası.", total: 5000, pct: 40 },
  ] },
  { slug: "antalya-resort-otel", business: "Antalya Resort Otel", owner: "Hakan Polat", city: "Antalya", category: "HOTEL", items: [
    { title: "Otel rezervasyonu (3 gece)", desc: "Her şey dahil, deniz manzaralı oda, 2 yetişkin.", total: 21000, pct: 40 },
    { title: "Aile odası rezervasyonu", desc: "Aile odası, 5 gece, kahvaltı dahil.", total: 8500, pct: 100 },
  ] },
  { slug: "premium-rent-a-car", business: "Premium Rent A Car", owner: "Cem Yıldırım", city: "İstanbul", category: "VEHICLE_RENTAL", items: [
    { title: "Lüks araç kiralama (5 gün)", desc: "Üst segment sedan, günlük 400 km limitli, tam kasko.", total: 22500, pct: 30 },
    { title: "Minivan kiralama (hafta sonu)", desc: "8 kişilik minivan, şoförsüz, 3 gün.", total: 9000, pct: 35 },
  ] },
  { slug: "kapadokya-konaklama", business: "Kapadokya Konaklama", owner: "Aslı Tekin", city: "Nevşehir", category: "HOTEL", items: [
    { title: "Mağara otel konaklaması", desc: "Mağara oda, 2 gece, balon turu dahil değil.", total: 14000, pct: 35 },
  ] },
  { slug: "anadolu-dugun-sarayi", business: "Anadolu Düğün Sarayı", owner: "Fatma Güneş", city: "Konya", category: "EVENT", items: [
    { title: "Düğün salonu kaporası", desc: "500 kişilik salon, cumartesi akşamı, ikram paketi seçilmiş.", total: 60000, pct: 25 },
    { title: "Kına gecesi organizasyonu", desc: "150 kişilik kına gecesi, dekor ve müzik dahil.", total: 16000, pct: 30 },
  ] },
  { slug: "pro-servis", business: "Pro Servis Teknik Hizmet", owner: "Volkan Acar", city: "Bursa", category: "SERVICE", items: [
    { title: "Mutfak tadilatı hizmeti", desc: "Mutfak dolapları söküm-montaj ve tezgah değişimi, 5 iş günü.", total: 48000, pct: 20 },
    { title: "Klima montaj hizmeti", desc: "2 adet inverter klima montajı, bakır boru dahil.", total: 7000, pct: 30 },
  ] },
];

const CUSTOMERS = [
  "Ahmet Yılmaz", "Mehmet Demir", "Elif Kaya", "Zeynep Arslan", "Burak Çelik",
  "Ayşe Koç", "Mustafa Aksoy", "Fatma Yıldız", "Emre Kılıç", "Selin Çetin",
  "Hasan Doğan", "Esra Erdoğan", "Can Özdemir", "Merve Aydın", "Oğuz Şen",
  "Gizem Korkmaz", "Kerem Bulut", "Büşra Tunç", "Serkan Aslan", "Pınar Yavuz",
  "Tolga Karaca", "Deniz Çakır", "Yusuf Eren", "Ceren Kurt", "Barış Taş",
];

type Outcome =
  | "COMPLETED" | "SECURED" | "WFC" | "CANCELLED" | "REFUND_CUST" | "REFUND_SELLER"
  | "DISPUTED" | "WAITING" | "EXPIRED" | "CANCEL_REQ";

// İlk 15 tamamlanmış (her satıcıda en az 1), sonrası karışık.
const OUTCOMES: Outcome[] = [
  ...Array<Outcome>(15).fill("COMPLETED"),
  ...Array<Outcome>(6).fill("SECURED"),
  ...Array<Outcome>(4).fill("WFC"),
  ...Array<Outcome>(5).fill("CANCELLED"),
  ...Array<Outcome>(3).fill("REFUND_CUST"),
  ...Array<Outcome>(2).fill("REFUND_SELLER"),
  ...Array<Outcome>(5).fill("DISPUTED"),
  ...Array<Outcome>(6).fill("WAITING"),
  ...Array<Outcome>(2).fill("EXPIRED"),
  ...Array<Outcome>(2).fill("CANCEL_REQ"),
];

const DAY = 86400000;

export function seedDemo() {
  suspendPersist(true);
  const r = rng(20260101);
  const rint = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  const at = (daysAgo: number, hours = 0) => new Date(base.getTime() - daysAgo * DAY + hours * 3600000);

  try {
    // --- kullanıcılar
    const sellerUsers: User[] = [];
    mutate((db) => {
      setNow(at(230));
      db.users.push({
        id: "USR-ADMIN", role: "ADMIN", name: "Platform Yöneticisi", email: DEMO_ADMIN.email, phone: "5559999999",
        passwordHash: bcrypt.hashSync(DEMO_ADMIN.password, 8), active: true, createdAt: at(230).toISOString(),
        notif: { sms: false, email: true, whatsapp: false },
      });
      const hash = bcrypt.hashSync(DEMO_SELLER_PASSWORD, 8);
      SELLERS.forEach((s, i) => {
        const u: User = {
          id: `USR-S${String(i + 1).padStart(2, "0")}`, role: "SELLER", name: s.owner, businessName: s.business,
          email: `${s.slug}@ekapora.demo`, phone: `55588800${String(i + 1).padStart(2, "0")}`, passwordHash: hash,
          active: true, createdAt: at(220 - i * 5).toISOString(), city: s.city, bankName: "Demo Banka A.Ş.",
          iban: `TR${"0".repeat(22)}${String(i + 1).padStart(2, "0")}`,
          notif: { sms: true, email: true, whatsapp: false },
        };
        db.users.push(u);
        sellerUsers.push(u);
      });
      CUSTOMERS.forEach((name, i) => {
        db.users.push({
          id: `USR-C${String(i + 1).padStart(2, "0")}`, role: "CUSTOMER", name, phone: `55500000${String(i + 1).padStart(2, "0")}`,
          email: i % 3 === 0 ? `musteri${i + 1}@ekapora.demo` : undefined, active: true,
          createdAt: at(200 - i * 3).toISOString(), notif: { sms: true, email: i % 3 === 0, whatsapp: true },
        });
      });
    });

    // --- işlem planı
    const specs = OUTCOMES.map((outcome, i) => {
      const seller = SELLERS[i % SELLERS.length];
      const su = sellerUsers[i % SELLERS.length];
      const item = seller.items[rint(0, seller.items.length - 1)];
      const cust = CUSTOMERS[(i * 7 + rint(0, 3)) % CUSTOMERS.length];
      const custIdx = CUSTOMERS.indexOf(cust) + 1;
      let daysAgo: number;
      switch (outcome) {
        case "COMPLETED": daysAgo = rint(30, 200); break;
        case "REFUND_CUST": case "REFUND_SELLER": daysAgo = rint(25, 120); break;
        case "CANCELLED": daysAgo = rint(8, 90); break;
        case "EXPIRED": daysAgo = rint(25, 45); break;
        case "WAITING": daysAgo = rint(1, 6); break;
        default: daysAgo = rint(2, 20);
      }
      const total = Math.round(item.total * (0.9 + r() * 0.2) / 100) * 100;
      const deposit = Math.max(500, Math.round((total * item.pct) / 100 / 50) * 50);
      return { outcome, seller, su, item, cust, custIdx, daysAgo, total, deposit };
    }).sort((a, b) => b.daysAgo - a.daysAgo);

    const customerActor = (i: number): Actor => ({ id: `USR-C${String(i).padStart(2, "0")}`, role: "CUSTOMER" });
    let n = 0;

    for (const s of specs) {
      n++;
      const sellerActor: Actor = { id: s.su.id, role: "SELLER" };
      const cust = customerActor(s.custIdx);
      const t0 = at(s.daysAgo);
      setNow(t0);
      const pol = CANCEL_POLICIES[n % CANCEL_POLICIES.length];
      const { id } = createTransaction(sellerActor, {
        category: s.seller.category,
        customerName: s.cust,
        customerPhone: `55500000${String(s.custIdx).padStart(2, "0")}`,
        customerEmail: "",
        title: s.item.title,
        description: s.item.desc,
        totalAmount: s.total * 100,
        deposit: s.deposit * 100,
        serviceDate: at(s.daysAgo - rint(10, 50)).toISOString().slice(0, 10),
        validDays: s.outcome === "EXPIRED" ? 7 : 14,
        cancelPolicy: pol.text,
        refundPolicy: "Satıcı kaynaklı iptallerde kapora ve komisyon bedelinin tamamı iade edilir.",
        deliveryTerms: "Teslimat / hizmet, anlaşılan tarihte ve açıklanan kapsamda gerçekleştirilecektir.",
        extraNotes: "",
      });
      const step = (hours: number) => setNow(new Date(t0.getTime() + hours * 3600000));
      const pay = (hours: number) => {
        step(hours);
        const res = payTransaction(cust, {
          txId: id, idemKey: `seed-${id}`,
          card: { number: DEMO_CARDS.success, name: s.cust.toUpperCase(), exp: "12/30", cvc: "123" },
        });
        if (!res.ok) throw new Error("seed ödeme başarısız");
      };

      switch (s.outcome) {
        case "COMPLETED":
          pay(3);
          step(24 * 8); confirmTransaction(sellerActor, id);
          step(24 * 9); confirmTransaction(cust, id);
          break;
        case "SECURED":
          pay(5);
          break;
        case "WFC":
          pay(4);
          step(30); confirmTransaction(n % 2 ? sellerActor : cust, id);
          break;
        case "CANCELLED":
          step(20); cancelUnpaid(n % 2 ? sellerActor : cust, id);
          break;
        case "REFUND_CUST":
          pay(2);
          step(24); requestCancel(cust, { txId: id, reason: "Plan değişikliği nedeniyle iptal etmek istiyorum." });
          step(30); respondCancel(sellerActor, { txId: id, accept: true });
          step(48); processRefund(sellerActor, id);
          break;
        case "REFUND_SELLER":
          pay(2);
          step(26); requestCancel(sellerActor, { txId: id, reason: "Tarih müsait olmadığı için hizmet verilemiyor." });
          step(40); processRefund(sellerActor, id);
          break;
        case "DISPUTED": {
          pay(3);
          step(24 * 4);
          const buyerOpens = n % 2 === 0;
          const { disputeId } = openDispute(buyerOpens ? cust : sellerActor, {
            txId: id,
            reason: buyerOpens
              ? "Hizmet, anlaşmada belirtilen kapsamda sunulmadı; eksikler giderilmedi."
              : "Müşteri hizmeti aldığı halde onay vermiyor ve iade talep ediyor.",
            evidenceName: buyerOpens ? "durum-fotograflari.zip" : "teslim-tutanagi.pdf",
          });
          step(24 * 4 + 6);
          addDisputeStatement(buyerOpens ? sellerActor : cust, {
            disputeId,
            text: buyerOpens
              ? "Hizmet sözleşmedeki şekilde verilmiştir, ekte tutanağı paylaşıyorum."
              : "Hizmet eksik verildi; fotoğraflar ekte, iade talep ediyorum.",
            evidenceName: buyerOpens ? "hizmet-tutanagi.pdf" : "ekran-goruntusu.png",
          });
          break;
        }
        case "WAITING":
          break;
        case "EXPIRED":
          break; // süpürme aşağıda yapılır
        case "CANCEL_REQ":
          pay(2);
          step(30); requestCancel(cust, { txId: id, reason: "Sağlık sorunu nedeniyle katılamayacağım." });
          break;
      }
    }

    // --- para çekme talepleri (en yüksek çekilebilir bakiyeli 5 satıcı)
    setNow(at(2));
    const adminActor: Actor = { id: "USR-ADMIN", role: "ADMIN" };
    const db = getDb();
    const ranked = sellerUsers
      .map((u) => ({ u, bal: sellerBalances(db, u.id).available }))
      .filter((x) => x.bal >= 10000)
      .sort((a, b) => b.bal - a.bal)
      .slice(0, 5);
    const plan: ("APPROVE" | "REJECT" | "PENDING")[] = ["APPROVE", "APPROVE", "REJECT", "PENDING", "PENDING"];
    ranked.forEach(({ u, bal }, i) => {
      const amount = Math.max(10000, Math.floor((bal * 0.6) / 10000) * 10000);
      const a: Actor = { id: u.id, role: "SELLER" };
      setNow(at(10 - i * 2));
      const { id } = requestWithdrawal(a, { amount, bankName: u.bankName ?? "Demo Banka A.Ş.", iban: u.iban ?? "" });
      if (plan[i] === "APPROVE") { setNow(at(9 - i * 2)); decideWithdrawal(adminActor, { id, approve: true, note: "Demo ödeme onaylandı." }); }
      if (plan[i] === "REJECT") { setNow(at(9 - i * 2)); decideWithdrawal(adminActor, { id, approve: false, note: "Demo: IBAN doğrulaması başarısız." }); }
    });
  } finally {
    setNow(null);
  }
  void now;
  sweepExpired();
  flush();
}
