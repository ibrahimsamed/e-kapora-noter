import bcrypt from "bcryptjs";
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { mutate, getDb, supabase } from "./data";
import { appUrl, resetMail, sendMail, verifyMail } from "./mail";
import { sendSms } from "./sms";
import { nowIso, now } from "./clock";
import { canTransition, STATUS_META } from "./workflow";
import { escrowHeld, sellerBalances } from "./balances";
import { normalizePhone } from "./format";
import { TERMS_SECTIONS, TERMS_VERSION } from "./terms-text";
import type {
  Actor,
  ActorRole,
  Db,
  Dispute,
  DisputeDecision,
  DisputeEvidence,
  LedgerKind,
  Role,
  Transaction,
  TxStatus,
  User,
} from "./types";

export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
const fail = (m: string, status = 400): never => {
  throw new AppError(m, status);
};

const SYSTEM = { id: "SYSTEM", role: "SYSTEM" as ActorRole };
type AnyActor = { id: string; role: ActorRole };

export const DEMO_OTP = "123456";
export const DEMO_CARDS = {
  success: "4242424242424242",
  declined: "4000000000000002",
  insufficient: "4000000000009995",
};

/* ------------------------------------------------------------------ helpers */

function nextId(db: Db, prefix: string) {
  return `${prefix}-${String(db.meta.idSeq++).padStart(5, "0")}`;
}

function audit(db: Db, actor: AnyActor, action: string, entityId: string, detail: string) {
  db.audit.push({
    id: nextId(db, "LOG"),
    at: nowIso(),
    actorId: actor.id,
    actorRole: actor.role,
    action,
    entityId,
    detail,
  });
}

function ledger(
  db: Db,
  tx: Transaction | null,
  kind: LedgerKind,
  amount: number,
  note: string,
  extra: { sellerId?: string; withdrawalId?: string } = {},
) {
  if (!Number.isInteger(amount) || amount <= 0) fail("Geçersiz tutar", 500);
  db.ledger.push({
    id: nextId(db, "LED"),
    at: nowIso(),
    kind,
    amount,
    txId: tx?.id,
    sellerId: tx?.sellerId ?? extra.sellerId,
    customerId: tx?.customerId,
    withdrawalId: extra.withdrawalId,
    note,
  });
}

/** Merkezi durum makinesi: tüm durum değişiklikleri buradan geçer ve audit log'a yazılır. */
function transition(db: Db, tx: Transaction, to: TxStatus, actor: AnyActor, label: string, note?: string) {
  if (!canTransition(tx.status, to, actor.role)) {
    fail(
      `Bu işlem şu an "${STATUS_META[tx.status].label}" durumunda; "${STATUS_META[to].label}" durumuna geçiş yetkiniz/uygunluğu yok.`,
      409,
    );
  }
  const from = tx.status;
  tx.prevStatus = from;
  tx.status = to;
  tx.updatedAt = nowIso();
  tx.events.push({ at: tx.updatedAt, label, actorRole: actor.role, actorId: actor.id, status: to });
  audit(db, actor, "TX_STATUS", tx.id, `${from} → ${to}${note ? ` (${note})` : ""} — ${label}`);
}

function getTx(db: Db, id: string): Transaction {
  const tx = db.transactions.find((t) => t.id === id);
  if (!tx) fail("İşlem bulunamadı", 404);
  return tx as Transaction;
}

function assertAccess(tx: Transaction, actor: Actor) {
  if (actor.role === "ADMIN") return;
  if (actor.role === "SELLER" && tx.sellerId === actor.id) return;
  if (actor.role === "CUSTOMER" && tx.customerId === actor.id) return;
  fail("İşlem bulunamadı", 404); // yetkisiz kullanıcıya varlığı sızdırma
}

function activeUser(db: Db, actor: Actor): User {
  const u = db.users.find((x) => x.id === actor.id);
  if (!u || !u.active) fail("Hesabınız pasif durumda.", 403);
  return u as User;
}

function isExpired(tx: Transaction) {
  return tx.status === "WAITING_FOR_PAYMENT" && new Date(tx.validUntil).getTime() < now().getTime();
}

/** Ödeme anındaki şartları ve işlem bilgilerini SHA-256 özetiyle bir kez kaydeder (sonradan değiştirilemez). */
function snapshotTerms(tx: Transaction) {
  if (tx.termsSnapshot) return;
  const content = JSON.stringify({
    version: TERMS_VERSION,
    terms: TERMS_SECTIONS,
    tx: {
      id: tx.id, sellerId: tx.sellerId, customerId: tx.customerId, category: tx.category, title: tx.title,
      description: tx.description, totalAmount: tx.totalAmount, deposit: tx.deposit, buyerFee: tx.buyerFee,
      sellerFee: tx.sellerFee, serviceDate: tx.serviceDate, validUntil: tx.validUntil, cancelPolicy: tx.cancelPolicy,
      refundPolicy: tx.refundPolicy, deliveryTerms: tx.deliveryTerms, extraNotes: tx.extraNotes,
    },
  });
  tx.termsSnapshot = { version: TERMS_VERSION, hash: createHash("sha256").update(content).digest("hex"), at: nowIso(), content };
}

/* ------------------------------------------------------------------ expiry */

const dueDecision = (d: Dispute, tx?: Transaction) =>
  d.status === "DECIDED" && !!d.appealUntil && new Date(d.appealUntil).getTime() < now().getTime() && !tx?.legalHold;

/** Süresi dolan işlemleri kapatır ve itiraz süresi dolan uyuşmazlık kararlarını uygular. */
export async function sweepExpired() {
  const db = await getDb();
  const txOf = (id: string) => db.transactions.find((t) => t.id === id);
  const hasDue = db.disputes.some((d) => dueDecision(d, txOf(d.txId)));
  if (!db.transactions.some(isExpired) && !hasDue) return;
  const applied: string[] = [];
  await mutate((d) => {
    for (const tx of d.transactions) {
      if (isExpired(tx)) {
        tx.closeReason = "Geçerlilik süresi içinde ödeme yapılmadı.";
        transition(d, tx, "EXPIRED", SYSTEM, "İşlem geçerlilik süresi doldu");
      }
    }
    for (const dd of d.disputes) {
      const tx = d.transactions.find((t) => t.id === dd.txId);
      if (!tx || !dueDecision(dd, tx) || !dd.proposal) continue;
      // Bir uyuşmazlığın uygulanamaması (ör. tutarsız havuz) tüm sayfa okumalarını bozmamalı.
      const snap = structuredClone({ tx, dd, ledger: d.ledger.length });
      try {
        finalizeDispute(d, tx, dd, SYSTEM, "AUTO", dd.approval?.note ?? dd.proposal.note);
        applied.push(dd.id);
      } catch {
        d.ledger.length = snap.ledger;
        Object.assign(tx, snap.tx);
        Object.assign(dd, snap.dd);
      }
    }
  });
  for (const id of applied) await notifyDispute(id, "Uyuşmazlık kararı uygulandı", "İtiraz süresi dolduğu için karar uygulandı.");
}

/* ------------------------------------------------------------------ auth */

const registerSchema = z.object({
  name: z.string().trim().min(3, "Ad soyad en az 3 karakter olmalı").max(80),
  businessName: z.string().trim().min(2, "İşletme adı gerekli").max(80),
  email: z.string().trim().toLowerCase().email("Geçerli bir e-posta girin"),
  phone: z.string(),
  password: z.string().min(8, "Parola en az 8 karakter olmalı").max(100),
});

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_PER_HOUR = 5;
const OTP_MAX_ATTEMPTS = 5;

/** Kayıt doğrulama kanalı: "email" (varsayılan) veya "sms". SMS altyapısı hazırdır; REGISTER_VERIFY_CHANNEL=sms ile açılır. */
type OtpChannel = "email" | "sms";
const registerChannel = (): OtpChannel => (process.env.REGISTER_VERIFY_CHANNEL === "sms" ? "sms" : "email");

const otpHash = (target: string, code: string) =>
  createHmac("sha256", process.env.SESSION_SECRET ?? "demo-secret-degistir").update(`${target}:${code}`).digest("hex");

const maskTarget = (channel: OtpChannel, target: string) =>
  channel === "email"
    ? target.replace(/^(.).*(@.*)$/, "$1***$2")
    : `0${target.slice(0, 3)} *** ** ${target.slice(8)}`;

interface PendingSeller {
  name: string;
  businessName: string;
  email: string;
  phone: string;
  passwordHash: string;
}

/** Adım 1: bilgileri doğrular, e-postaya (veya SMS ile telefona) 6 haneli kod gönderir. Hesap henüz oluşturulmaz. */
export async function startRegistration(input: unknown): Promise<{ otpId: string; channel: OtpChannel; maskedTarget: string; expiresInSec: number }> {
  const p = registerSchema.parse(input);
  const phone = normalizePhone(p.phone);
  if (!phone) fail("Geçerli bir cep telefonu girin (5xx xxx xx xx)");
  const db = await getDb();
  if (db.users.some((u) => u.email === p.email)) fail("Bu e-posta ile kayıtlı bir hesap var.", 409);
  if (db.users.some((u) => u.phone === phone && u.role !== "CUSTOMER"))
    fail("Bu telefon numarası başka bir hesapta kayıtlı.", 409);

  const channel = registerChannel();
  const target = channel === "email" ? p.email : (phone as string);
  const col = channel === "email" ? "email" : "phone";
  const sb = supabase();
  const hourAgo = new Date(now().getTime() - 3600_000).toISOString();
  const recent = await sb.from("sms_otps").select("created_at").eq("channel", channel).eq(col, target).gt("created_at", hourAgo).order("created_at", { ascending: false });
  if (recent.error) throw new Error("sms_otps okunamadı");
  if (recent.data.length >= OTP_MAX_PER_HOUR) fail("Çok fazla deneme yaptınız. Lütfen bir saat sonra tekrar deneyin.", 429);
  if (recent.data[0] && now().getTime() - new Date(recent.data[0].created_at).getTime() < OTP_COOLDOWN_MS)
    fail("Yeni kod için lütfen 1 dakika bekleyin.", 429);

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const pending: PendingSeller = {
    name: p.name,
    businessName: p.businessName,
    email: p.email,
    phone: phone as string,
    passwordHash: bcrypt.hashSync(p.password, 8),
  };
  await sb.from("sms_otps").delete().eq("channel", channel).eq(col, target).is("consumed_at", null);
  const ins = await sb
    .from("sms_otps")
    .insert({
      purpose: "register",
      channel,
      phone,
      email: p.email,
      code_hash: otpHash(target, code),
      payload: pending,
      expires_at: new Date(now().getTime() + OTP_TTL_MS).toISOString(),
    })
    .select("id")
    .single();
  if (ins.error) throw new Error("sms_otps yazılamadı");
  try {
    if (channel === "email") await sendMail({ to: p.email, ...verifyMail(p.name, code) });
    else await sendSms(phone as string, `e-kapora noter doğrulama kodunuz: ${code}. Kimseyle paylaşmayın.`);
  } catch (e) {
    await sb.from("sms_otps").delete().eq("id", ins.data.id);
    console.error("[otp] doğrulama kodu gönderilemedi:", (e as { code?: string }).code ?? (e as Error).message);
    fail("Doğrulama kodu gönderilemedi. Lütfen daha sonra tekrar deneyin.", 502);
  }
  return { otpId: ins.data.id as string, channel, maskedTarget: maskTarget(channel, target), expiresInSec: OTP_TTL_MS / 1000 };
}

/** Adım 2: kod doğruysa hesabı oluşturur ve kullanıcıyı döndürür (oturumu çağıran açar). */
export async function verifyRegistration(otpId: string, codeRaw: string): Promise<User> {
  const code = codeRaw.replace(/\s/g, "");
  if (!/^[0-9a-f-]{36}$/.test(otpId) || !/^\d{6}$/.test(code)) fail("Doğrulama kodu hatalı.", 400);
  const sb = supabase();
  const row = await sb.from("sms_otps").select("*").eq("id", otpId).eq("purpose", "register").maybeSingle();
  if (row.error) throw new Error("sms_otps okunamadı");
  const o = row.data;
  if (!o || o.consumed_at || new Date(o.expires_at).getTime() < now().getTime())
    fail("Kodun süresi doldu. Lütfen yeni kod isteyin.", 400);
  if (o.attempts >= OTP_MAX_ATTEMPTS) fail("Çok fazla hatalı deneme. Lütfen yeni kod isteyin.", 429);

  // Deneme sayacı önce artırılır (iyimser kilit): paralel isteklerle sınır aşılamaz.
  const bump = await sb.from("sms_otps").update({ attempts: o.attempts + 1 }).eq("id", o.id).eq("attempts", o.attempts).select("id");
  if (bump.error) throw new Error("sms_otps güncellenemedi");
  if (!bump.data.length) fail("İşlem çakıştı, lütfen tekrar deneyin.", 409);

  const target = o.channel === "email" ? (o.email as string) : (o.phone as string);
  const a = Buffer.from(otpHash(target, code));
  const b = Buffer.from(o.code_hash as string);
  if (a.length !== b.length || !timingSafeEqual(a, b)) fail("Doğrulama kodu hatalı.", 401);

  // Tek kullanımlık: yalnızca bir istek kodu "kullanıldı" yapabilir.
  const claim = await sb
    .from("sms_otps")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", o.id)
    .is("consumed_at", null)
    .select("id");
  if (claim.error) throw new Error("sms_otps güncellenemedi");
  if (!claim.data.length) fail("Kod daha önce kullanıldı.", 409);

  const p = o.payload as PendingSeller;
  return await mutate((db) => {
    if (db.users.some((u) => u.email === p.email)) fail("Bu e-posta ile kayıtlı bir hesap var.", 409);
    if (db.users.some((u) => u.phone === p.phone && u.role !== "CUSTOMER"))
      fail("Bu telefon numarası başka bir hesapta kayıtlı.", 409);
    const user: User = {
      id: nextId(db, "USR"),
      role: "SELLER",
      name: p.name,
      businessName: p.businessName,
      email: p.email,
      phone: p.phone,
      passwordHash: p.passwordHash,
      active: true,
      createdAt: nowIso(),
      notif: { sms: true, email: true, whatsapp: false },
    };
    db.users.push(user);
    audit(db, { id: user.id, role: "SELLER" }, "REGISTER", user.id, "Satıcı hesabı telefon doğrulamasıyla oluşturuldu");
    return user;
  });
}

export async function loginWithPassword(email: string, password: string): Promise<User> {
  const db = await getDb();
  const u = db.users.find((x) => x.email === email.trim().toLowerCase() && x.passwordHash);
  // zamanlama farkını azaltmak için her durumda hash karşılaştır
  const ok = bcrypt.compareSync(password, u?.passwordHash ?? "$2a$08$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid");
  if (!u || !ok) fail("E-posta veya parola hatalı.", 401);
  if (!(u as User).active) fail("Hesabınız pasif durumda. Lütfen destek ile iletişime geçin.", 403);
  await mutate((d) => audit(d, { id: (u as User).id, role: (u as User).role }, "LOGIN", (u as User).id, "Giriş yapıldı"));
  return u as User;
}

const RESET_TTL_MS = 60 * 60 * 1000;
const RESET_COOLDOWN_MS = 60 * 1000;
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Hesap var olsun ya da olmasın aynı şekilde döner (kullanıcı sayımı/numaralandırma engellenir). */
export async function requestPasswordReset(emailRaw: string): Promise<void> {
  const email = z.string().trim().toLowerCase().email().safeParse(emailRaw);
  if (!email.success) return;
  const db = await getDb();
  const u = db.users.find((x) => x.email === email.data && x.passwordHash && x.active);
  if (!u) return;
  const sb = supabase();
  const since = new Date(now().getTime() - RESET_COOLDOWN_MS).toISOString();
  const recent = await sb.from("password_resets").select("id").eq("user_id", u.id).gt("created_at", since).limit(1);
  if (recent.error) throw new Error("password_resets okunamadı");
  if (recent.data.length) return; // dakikada en fazla 1 e-posta
  const token = randomBytes(32).toString("base64url");
  await sb.from("password_resets").delete().eq("user_id", u.id).is("used_at", null);
  const ins = await sb.from("password_resets").insert({
    user_id: u.id,
    token_hash: hashToken(token),
    expires_at: new Date(now().getTime() + RESET_TTL_MS).toISOString(),
  });
  if (ins.error) throw new Error("password_resets yazılamadı");
  const link = `${appUrl()}/sifre-sifirla?token=${token}`;
  try {
    await sendMail({ to: u.email as string, ...resetMail(u.name, link) });
  } catch (e) {
    // Hata istemciye yansıtılmaz: yanıt farkı hesabın varlığını ele verirdi.
    console.error("[mail] parola sıfırlama e-postası gönderilemedi:", (e as { code?: string }).code ?? (e as Error).message);
    return;
  }
  await mutate((d) => audit(d, { id: u.id, role: u.role }, "PASSWORD_RESET_REQUEST", u.id, "Parola sıfırlama bağlantısı gönderildi"));
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const pw = z.string().min(8, "Parola en az 8 karakter olmalı").max(100).parse(password);
  if (!token || token.length < 20) fail("Bağlantı geçersiz veya süresi dolmuş.", 400);
  const sb = supabase();
  // Tek kullanımlık: yalnızca bir istek jetonu "kullanıldı" olarak işaretleyebilir.
  const claim = await sb
    .from("password_resets")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", hashToken(token))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("user_id");
  if (claim.error) throw new Error("password_resets güncellenemedi");
  if (!claim.data.length) fail("Bağlantı geçersiz veya süresi dolmuş.", 400);
  const userId = claim.data[0].user_id as string;
  await mutate((d) => {
    const u = d.users.find((x) => x.id === userId);
    if (!u || !u.active) fail("Hesap bulunamadı veya pasif.", 400);
    (u as User).passwordHash = bcrypt.hashSync(pw, 8);
    audit(d, { id: userId, role: (u as User).role }, "PASSWORD_RESET", userId, "Parola sıfırlandı");
  });
}

export async function requestOtp(phoneRaw: string, txId?: string): Promise<{ phone: string; demoCode: string }> {
  const phone = normalizePhone(phoneRaw);
  if (!phone) fail("Geçerli bir cep telefonu girin (5xx xxx xx xx)");
  const db = await getDb();
  const cust = db.users.find((u) => u.phone === phone && u.role === "CUSTOMER");
  if (!cust) fail("Bu telefon numarası ile eşleşen bir işlem bulunamadı.", 404);
  if (!txId?.trim()) fail("İşlem ID zorunludur.");
  const tx = db.transactions.find((t) => t.id === (txId as string).trim().toUpperCase());
  if (!tx || tx.customerId !== (cust as User).id) fail("İşlem ID ve telefon numarası eşleşmiyor.", 404);
  return { phone: phone as string, demoCode: DEMO_OTP };
}

export async function verifyOtp(phoneRaw: string, code: string): Promise<User> {
  const phone = normalizePhone(phoneRaw);
  if (!phone) fail("Geçersiz telefon");
  if (code.trim() !== DEMO_OTP) fail("Doğrulama kodu hatalı.", 401);
  const db = await getDb();
  const cust = db.users.find((u) => u.phone === phone && u.role === "CUSTOMER");
  if (!cust) fail("Müşteri bulunamadı", 404);
  if (!(cust as User).active) fail("Hesabınız pasif durumda.", 403);
  await mutate((d) => audit(d, { id: (cust as User).id, role: "CUSTOMER" }, "LOGIN_OTP", (cust as User).id, "OTP ile erişim"));
  return cust as User;
}

/* ------------------------------------------------------------------ transactions */

const createSchema = z.object({
  category: z.enum(["PRODUCT", "VEHICLE_SALE", "VEHICLE_RENTAL", "VILLA_RENTAL", "HOTEL", "EVENT", "SERVICE", "OTHER"]),
  customerName: z.string().trim().min(3, "Müşteri adı soyadı gerekli").max(80),
  customerPhone: z.string(),
  customerEmail: z.string().trim().email("Geçerli bir e-posta girin").optional().or(z.literal("")),
  title: z.string().trim().min(3, "İşlem başlığı gerekli").max(120),
  description: z.string().trim().min(5, "Açıklama gerekli").max(2000),
  totalAmount: z.number().int().positive("Toplam bedel pozitif olmalı").max(100_000_000_00),
  deposit: z.number().int().positive("Kapora pozitif olmalı"),
  serviceDate: z.string().min(8, "Hizmet / teslimat tarihi gerekli"),
  validDays: z.number().int().min(1).max(60),
  cancelPolicy: z.string().trim().min(5, "İptal koşulu gerekli").max(1000),
  refundPolicy: z.string().trim().min(5, "İade koşulu gerekli").max(1000),
  deliveryTerms: z.string().trim().min(5, "Teslimat / hizmet koşulu gerekli").max(1000),
  extraNotes: z.string().trim().max(1000).optional().default(""),
});

export function feeOf(deposit: number, bps: number) {
  return Math.round((deposit * bps) / 10000);
}

export async function createTransaction(actor: Actor, input: unknown): Promise<{ id: string }> {
  if (actor.role !== "SELLER") fail("Yalnızca satıcılar işlem oluşturabilir.", 403);
  const p = createSchema.parse(input);
  const phone = normalizePhone(p.customerPhone);
  if (!phone) fail("Geçerli bir müşteri cep telefonu girin");
  if (p.deposit > p.totalAmount) fail("Kapora, toplam bedelden büyük olamaz.");
  return await mutate((db) => {
    const seller = activeUser(db, actor);
    if (seller.phone === phone) fail("Kendi telefon numaranıza işlem oluşturamazsınız.");
    // Satıcı/yönetici hesabı olan bir numara da müşteri olabilir: müşteri kaydı ayrı bir (CUSTOMER) hesaptır.
    let cust = db.users.find((u) => u.phone === phone && u.role === "CUSTOMER");
    if (!cust) {
      cust = {
        id: nextId(db, "USR"),
        role: "CUSTOMER",
        name: p.customerName,
        email: p.customerEmail || undefined,
        phone: phone as string,
        active: true,
        createdAt: nowIso(),
        notif: { sms: true, email: !!p.customerEmail, whatsapp: true },
      };
      db.users.push(cust);
    } else if (!cust.active) {
      fail("Bu müşteri hesabı pasif durumda; işlem oluşturulamaz.", 403);
    }
    const created = nowIso();
    const id = `EK-${now().getFullYear()}-${String(++db.meta.seq).padStart(6, "0")}`;
    const tx: Transaction = {
      id,
      sellerId: seller.id,
      customerId: cust.id,
      category: p.category,
      title: p.title,
      description: p.description,
      totalAmount: p.totalAmount,
      deposit: p.deposit,
      buyerFeeBps: db.settings.buyerFeeBps,
      sellerFeeBps: db.settings.sellerFeeBps,
      buyerFee: feeOf(p.deposit, db.settings.buyerFeeBps),
      sellerFee: feeOf(p.deposit, db.settings.sellerFeeBps),
      serviceDate: p.serviceDate,
      validUntil: new Date(now().getTime() + p.validDays * 86400000).toISOString(),
      cancelPolicy: p.cancelPolicy,
      refundPolicy: p.refundPolicy,
      deliveryTerms: p.deliveryTerms,
      extraNotes: p.extraNotes ?? "",
      status: "CREATED",
      createdAt: created,
      updatedAt: created,
      events: [{ at: created, label: "İşlem oluşturuldu", actorRole: "SELLER", actorId: seller.id, status: "CREATED" }],
      documents: [{ name: "Anlaşma koşulları (dijital)", at: created, by: "SELLER" }],
    };
    db.transactions.push(tx);
    audit(db, actor, "TX_CREATE", id, `${p.title} — kapora ${p.deposit} kuruş`);
    transition(db, tx, "WAITING_FOR_PAYMENT", actor, "Müşteri bilgilendirildi — ödeme bağlantısı oluşturuldu");
    return { id };
  });
}

const cardSchema = z.object({
  txId: z.string(),
  idemKey: z.string().min(6).max(80),
  termsAccepted: z.literal(true, { message: "Ödeme için şartlar ve koşulları kabul etmelisiniz." }),
  card: z.object({
    number: z.string(),
    name: z.string().trim().min(3, "Kart üzerindeki isim gerekli"),
    exp: z.string(),
    cvc: z.string().regex(/^\d{3}$/, "CVC 3 haneli olmalı"),
  }),
});

export async function payTransaction(actor: Actor, input: unknown): Promise<{ ok: boolean; message: string }> {
  if (actor.role !== "CUSTOMER") fail("Yalnızca müşteri ödeme yapabilir.", 403);
  const p = cardSchema.parse(input);
  const digits = p.card.number.replace(/\D/g, "");
  const known = Object.values(DEMO_CARDS);
  // Gerçek kart bilgisi asla işlenmez / saklanmaz.
  if (!known.includes(digits))
    fail("Kart bilgileri geçersiz.");
  const m = /^(\d{2})\/(\d{2})$/.exec(p.card.exp.trim());
  if (!m || +m[1] < 1 || +m[1] > 12) fail("Son kullanma tarihi AA/YY biçiminde olmalı");
  const expDate = new Date(2000 + +(m as RegExpExecArray)[2], +(m as RegExpExecArray)[1], 0, 23, 59);
  if (expDate < now()) fail("Kartın son kullanma tarihi geçmiş");

  return await mutate((db) => {
    const tx = getTx(db, p.txId);
    assertAccess(tx, actor);
    activeUser(db, actor);
    // idempotency: aynı istek tekrarlanırsa önceki sonucu döndür
    const prev = db.payments.find((x) => x.idemKey === p.idemKey);
    if (prev) return { ok: prev.status === "SUCCESS", message: prev.status === "SUCCESS" ? "Ödeme zaten alındı." : (prev.failReason ?? "Ödeme başarısız.") };
    if (isExpired(tx)) {
      tx.closeReason = "Geçerlilik süresi içinde ödeme yapılmadı.";
      transition(db, tx, "EXPIRED", SYSTEM, "İşlem geçerlilik süresi doldu");
      return { ok: false, message: "İşlemin geçerlilik süresi dolmuş." };
    }
    if (tx.status !== "WAITING_FOR_PAYMENT") fail("Bu işlem için ödeme alınamaz (durum: " + STATUS_META[tx.status].label + ").", 409);
    if (db.payments.some((x) => x.txId === tx.id && x.status === "SUCCESS")) fail("Bu işlem için ödeme zaten yapılmış.", 409);

    const amount = tx.deposit + tx.buyerFee;
    const last4 = digits.slice(-4);
    transition(db, tx, "PAYMENT_PROCESSING", actor, `Ödeme başlatıldı (kart •••• ${last4})`);

    let failReason: string | undefined;
    if (digits === DEMO_CARDS.declined) failReason = "Kart reddedildi.";
    else if (digits === DEMO_CARDS.insufficient) failReason = "Yetersiz bakiye.";

    db.payments.push({
      id: nextId(db, "PAY"),
      txId: tx.id,
      amount,
      cardLast4: last4,
      status: failReason ? "FAILED" : "SUCCESS",
      failReason,
      at: nowIso(),
      idemKey: p.idemKey,
    });

    if (failReason) {
      transition(db, tx, "WAITING_FOR_PAYMENT", SYSTEM, `Ödeme başarısız: ${failReason}`);
      return { ok: false, message: failReason };
    }
    ledger(db, tx, "PAYMENT", amount, `Ödeme •••• ${last4} (kapora + alıcı komisyonu)`);
    tx.securedAt = nowIso();
    snapshotTerms(tx);
    transition(db, tx, "SECURED", SYSTEM, "Ödeme güvence altına alındı");
    return { ok: true, message: "Ödemeniz başarıyla alındı ve güvence altına alındı." };
  });
}

/** Müşteri havale/EFT yaptığını bildirir; admin hesabı kontrol edip onaylayana kadar işlem "Ödeme İşleniyor"da bekler. */
export async function notifyTransfer(actor: Actor, txId: string) {
  if (actor.role !== "CUSTOMER") fail("Yalnızca müşteri havale bildirimi yapabilir.", 403);
  return await mutate((db) => {
    const tx = getTx(db, txId);
    assertAccess(tx, actor);
    activeUser(db, actor);
    if (isExpired(tx)) {
      tx.closeReason = "Geçerlilik süresi içinde ödeme yapılmadı.";
      transition(db, tx, "EXPIRED", SYSTEM, "İşlem geçerlilik süresi doldu");
      return { status: tx.status };
    }
    if (tx.status !== "WAITING_FOR_PAYMENT") fail("Bu işlem için ödeme bildirilemez (durum: " + STATUS_META[tx.status].label + ").", 409);
    transition(db, tx, "PAYMENT_PROCESSING", actor, `Müşteri havale/EFT yaptığını bildirdi (açıklama: ${tx.id})`);
    return { status: tx.status };
  });
}

/** Admin: havale hesaba ulaştıysa onaylar (güvenli havuza alır), ulaşmadıysa reddeder (ödeme bekleniyora döner). */
export async function decideTransfer(actor: Actor, input: { txId: string; approve: boolean }) {
  if (actor.role !== "ADMIN") fail("Yetkisiz işlem", 403);
  return await mutate((db) => {
    const tx = getTx(db, input.txId);
    if (tx.status !== "PAYMENT_PROCESSING") fail("Bu işlemde onay bekleyen havale yok.", 409);
    if (!input.approve) {
      transition(db, tx, "WAITING_FOR_PAYMENT", actor, "Havale hesaba ulaşmadı; ödeme tekrar bekleniyor");
      return { status: tx.status };
    }
    if (db.payments.some((x) => x.txId === tx.id && x.status === "SUCCESS")) fail("Bu işlem için ödeme zaten yapılmış.", 409);
    const amount = tx.deposit + tx.buyerFee;
    db.payments.push({
      id: nextId(db, "PAY"),
      txId: tx.id,
      amount,
      cardLast4: "HAVALE",
      status: "SUCCESS",
      at: nowIso(),
      idemKey: `transfer-${tx.id}`,
    });
    ledger(db, tx, "PAYMENT", amount, "Havale/EFT ödemesi (kapora + alıcı komisyonu)");
    tx.securedAt = nowIso();
    snapshotTerms(tx);
    transition(db, tx, "SECURED", actor, "Havale onaylandı; ödeme güvence altına alındı");
    return { status: tx.status };
  });
}

function assertNoHold(tx: Transaction) {
  if (tx.legalHold) fail(`İşlem üzerinde hukuki blokaj var (${tx.legalHold.reference}); para hareketi yapılamaz.`, 423);
}

function releaseToSeller(db: Db, tx: Transaction, actor: AnyActor, label: string) {
  assertNoHold(tx);
  const held = escrowHeld(db, tx.id);
  const expected = tx.deposit + tx.buyerFee;
  if (held !== expected) fail("Güvenli havuz bakiyesi tutarsız; işlem sonuçlandırılamaz.", 409);
  ledger(db, tx, "RELEASE_SELLER", tx.deposit - tx.sellerFee, "Satıcıya aktarım (kapora − satıcı komisyonu)");
  ledger(db, tx, "COMMISSION", tx.buyerFee + tx.sellerFee, "Platform komisyonu (alıcı + satıcı)");
  tx.completedAt = nowIso();
  transition(db, tx, "COMPLETED", actor, label);
}

function refundBuyer(db: Db, tx: Transaction, actor: AnyActor, reason: string, label: string) {
  assertNoHold(tx);
  if (db.ledger.some((l) => l.txId === tx.id && l.kind === "REFUND")) fail("Bu işlemde iade zaten yapılmış.", 409);
  const held = escrowHeld(db, tx.id);
  if (held <= 0) fail("İade edilecek güvence altında tutar yok.", 409);
  ledger(db, tx, "REFUND", held, `Müşteriye iade (kapora + alıcı komisyonu) — ${reason}`);
  tx.refund = { amount: held, at: nowIso(), reason, by: actor.role };
  transition(db, tx, "REFUNDED", actor, label);
}

export async function confirmTransaction(actor: Actor, txId: string) {
  if (actor.role !== "CUSTOMER" && actor.role !== "SELLER") fail("Yetkisiz işlem", 403);
  return await mutate((db) => {
    const tx = getTx(db, txId);
    assertAccess(tx, actor);
    activeUser(db, actor);
    if (tx.status !== "SECURED" && tx.status !== "WAITING_FOR_CONFIRMATION")
      fail("İşlem şu an onaylanabilir durumda değil.", 409);
    // Ödeme alınıp güvenli havuza geçmeden hiçbir taraf onay veremez.
    if (!db.payments.some((x) => x.txId === tx.id && x.status === "SUCCESS") || escrowHeld(db, tx.id) <= 0)
      fail("Ödeme yapılmadan işlem onaylanamaz.", 409);
    const field = actor.role === "CUSTOMER" ? "buyerConfirmedAt" : "sellerConfirmedAt";
    if (tx[field]) fail("Bu işlemi zaten onayladınız.", 409);
    tx[field] = nowIso();
    const who = actor.role === "CUSTOMER" ? "Müşteri" : "Satıcı";
    if (tx.buyerConfirmedAt && tx.sellerConfirmedAt) {
      releaseToSeller(db, tx, actor, `${who} onayladı — iki taraf onayı tamamlandı, işlem tamamlandı`);
    } else {
      transition(db, tx, "WAITING_FOR_CONFIRMATION", actor, `${who} onayladı — karşı tarafın onayı bekleniyor`);
    }
    return { status: tx.status };
  });
}

export async function cancelUnpaid(actor: Actor, txId: string) {
  return await mutate((db) => {
    const tx = getTx(db, txId);
    assertAccess(tx, actor);
    if (tx.status !== "WAITING_FOR_PAYMENT") fail("Yalnızca ödeme bekleyen işlemler doğrudan iptal edilebilir.", 409);
    tx.closeReason = "Ödeme alınmadan iptal edildi.";
    transition(db, tx, "CANCELLED", actor, "İşlem ödeme alınmadan iptal edildi");
    return { status: tx.status };
  });
}

export async function requestCancel(actor: Actor, input: { txId: string; reason: string }) {
  const reason = z.string().trim().min(5, "İptal gerekçesi en az 5 karakter olmalı").max(500).parse(input.reason);
  return await mutate((db) => {
    const tx = getTx(db, input.txId);
    assertAccess(tx, actor);
    if (tx.status !== "SECURED" && tx.status !== "WAITING_FOR_CONFIRMATION")
      fail("Bu aşamada iptal/iade talebi oluşturulamaz.", 409);
    tx.cancelRequest = { by: actor.role, reason, at: nowIso() };
    if (actor.role === "CUSTOMER") {
      transition(db, tx, "CANCELLATION_REQUESTED", actor, `Müşteri iptal talebi oluşturdu: ${reason}`);
    } else {
      // satıcı / admin: iade sürecini doğrudan başlatır
      const who = actor.role === "SELLER" ? "Satıcı" : "Admin";
      transition(db, tx, "REFUND_PROCESSING", actor, `${who} iptal/iade başlattı: ${reason}`);
    }
    return { status: tx.status };
  });
}

export async function respondCancel(actor: Actor, input: { txId: string; accept: boolean }) {
  if (actor.role === "CUSTOMER") fail("Yetkisiz işlem", 403);
  return await mutate((db) => {
    const tx = getTx(db, input.txId);
    assertAccess(tx, actor);
    if (tx.status !== "CANCELLATION_REQUESTED") fail("Bekleyen bir iptal talebi yok.", 409);
    const who = actor.role === "SELLER" ? "Satıcı" : "Admin";
    if (input.accept) {
      transition(db, tx, "REFUND_PROCESSING", actor, `${who} iptal talebini onayladı — iade süreci başladı`);
    } else {
      const back: TxStatus = tx.prevStatus === "WAITING_FOR_CONFIRMATION" ? "WAITING_FOR_CONFIRMATION" : "SECURED";
      tx.cancelRequest = undefined;
      transition(db, tx, back, actor, `${who} iptal talebini reddetti — işlem devam ediyor`);
    }
    return { status: tx.status };
  });
}

export async function processRefund(actor: Actor, txId: string) {
  if (actor.role === "CUSTOMER") fail("Yetkisiz işlem", 403);
  return await mutate((db) => {
    const tx = getTx(db, txId);
    assertAccess(tx, actor);
    if (tx.status !== "REFUND_PROCESSING") fail("İade işlenebilecek durumda değil.", 409);
    refundBuyer(db, tx, actor, tx.cancelRequest?.reason ?? "İptal/iade", "İade tamamlandı — tutar müşteriye iade edildi");
    return { status: tx.status };
  });
}

/* ------------------------------------------------------------------ disputes */

/** Süreç süreleri (rapor 3.2). Resmî tatiller hesaba katılmaz; yalnızca hafta sonları atlanır. */
const RESPOND_HOURS = 72;
const DECIDE_BUSINESS_DAYS = 7;
const APPEAL_BUSINESS_DAYS = 5;
const APPEAL_DAYS = 3;

function addBusinessDays(from: Date, n: number) {
  const d = new Date(from);
  let left = n;
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const w = d.getDay();
    if (w !== 0 && w !== 6) left--;
  }
  return d;
}

const evidenceInput = z.object({
  name: z.string().trim().min(1).max(120),
  path: z.string().min(3).max(300),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  sizeKb: z.number().int().min(0).max(100000),
  mime: z.string().max(100),
});

function addEvidence(tx: Transaction, bucket: DisputeEvidence[], raw: unknown, by: Role, at: string) {
  if (!raw) return;
  const e = evidenceInput.parse(raw);
  if (!e.path.startsWith(`${tx.id}/`) || e.path.includes("..")) fail("Geçersiz kanıt dosyası.");
  bucket.push({ ...e, by, at });
  tx.documents.push({ name: e.name, at, by });
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** Bildirim (SMS / e-posta): en iyi çaba; hata işlemi asla bozmaz. */
async function notifyDispute(disputeId: string, subject: string, text: string, who: Role[] = ["CUSTOMER", "SELLER"]) {
  try {
    const db = await getDb();
    const d = db.disputes.find((x) => x.id === disputeId);
    const tx = d && db.transactions.find((t) => t.id === d.txId);
    if (!d || !tx) return;
    const users = db.users.filter(
      (u) =>
        u.active &&
        ((who.includes("CUSTOMER") && u.id === tx.customerId) ||
          (who.includes("SELLER") && u.id === tx.sellerId) ||
          (who.includes("ADMIN") && u.role === "ADMIN")),
    );
    const body = `${text}\nİşlem: ${tx.id} • Uyuşmazlık: ${d.id}\n${appUrl()}`;
    const jobs: Promise<void>[] = [];
    for (const u of users) {
      if (u.notif.sms && u.phone) jobs.push(sendSms(u.phone, `e-kapora noter: ${subject}. ${text} (İşlem ${tx.id})`));
      if (u.notif.email && u.email)
        jobs.push(sendMail({ to: u.email, subject: `e-kapora noter — ${subject}`, text: body, html: `<p>${esc(body).replace(/\n/g, "<br>")}</p>` }));
    }
    await Promise.allSettled(jobs);
  } catch {
    /* bildirim başarısızlığı yok sayılır */
  }
}

const decisionOf = (bps: number): DisputeDecision => (bps >= 10000 ? "REFUND_BUYER" : bps <= 0 ? "PAY_SELLER" : "SPLIT");
const bpsOf = (decision: DisputeDecision, refundBps?: number) =>
  decision === "REFUND_BUYER" ? 10000 : decision === "PAY_SELLER" ? 0 : z.number().int().min(1, "Oran %0–%100 arasında olmalı").max(9999, "Kısmi oran %100'den küçük olmalı").parse(refundBps);
const decisionText = (bps: number) =>
  bps >= 10000 ? "müşteriye tam iade" : bps <= 0 ? "satıcıya aktarım" : `kaporanın %${bps / 100}'i müşteriye iade, kalanı satıcıya`;

const activeAdmins = (db: Db) => db.users.filter((u) => u.role === "ADMIN" && u.active);

/** Çift onay: aynı yönetici birden fazla aşamada karar veremez (başka yönetici varsa). */
function assertDistinctAdmin(db: Db, actor: Actor, used: (string | undefined)[]) {
  const others = activeAdmins(db).filter((u) => !used.includes(u.id));
  if (used.includes(actor.id) && others.length > 0)
    fail("Çift onay kuralı: bu aşamada daha önce işlem yapmamış bir yönetici gerekir.", 403);
}

/**
 * Havuzdaki parayı müşteri / satıcı / platform arasında dağıtır.
 * refundBps: kaporanın müşteriye iade edilecek oranı (10000 = tam iade, 0 = tam aktarım). Alıcı ve satıcı komisyonu,
 * yalnızca satıcıya aktarılan pay oranında kesilir; iade edilen payın komisyonu müşteriye geri döner.
 */
function distribute(db: Db, tx: Transaction, refundBps: number, actor: AnyActor, label: string, reason: string) {
  assertNoHold(tx);
  if (refundBps >= 10000) return refundBuyer(db, tx, actor, reason, label);
  if (refundBps <= 0) return releaseToSeller(db, tx, actor, label);
  if (escrowHeld(db, tx.id) !== tx.deposit + tx.buyerFee) fail("Güvenli havuz bakiyesi tutarsız; işlem sonuçlandırılamaz.", 409);
  const refundDeposit = Math.round((tx.deposit * refundBps) / 10000);
  const sellerShare = tx.deposit - refundDeposit;
  const sellerFeeApplied = Math.round((tx.sellerFee * sellerShare) / tx.deposit);
  const buyerFeeApplied = Math.round((tx.buyerFee * sellerShare) / tx.deposit);
  const buyerRefund = refundDeposit + (tx.buyerFee - buyerFeeApplied);
  const sellerNet = sellerShare - sellerFeeApplied;
  const commission = buyerFeeApplied + sellerFeeApplied;
  const pct = refundBps / 100;
  if (buyerRefund > 0) ledger(db, tx, "REFUND", buyerRefund, `Kısmi iade (%${pct}) — ${reason}`);
  if (sellerNet > 0) ledger(db, tx, "RELEASE_SELLER", sellerNet, `Satıcıya kısmi aktarım (%${100 - pct}) — komisyon düşülmüş`);
  if (commission > 0) ledger(db, tx, "COMMISSION", commission, "Platform komisyonu (aktarılan pay oranında)");
  tx.refund = { amount: buyerRefund, at: nowIso(), reason, by: actor.role };
  tx.completedAt = nowIso();
  transition(db, tx, "COMPLETED", actor, label);
}

function finalizeDispute(
  db: Db,
  tx: Transaction,
  dd: Dispute,
  actor: AnyActor,
  via: NonNullable<Dispute["resolution"]>["via"],
  note: string,
  override?: { refundBps: number },
) {
  const bps = override?.refundBps ?? dd.proposal?.refundBps;
  if (bps === undefined) fail("Uygulanacak karar yok.", 409);
  const b = bps as number;
  distribute(db, tx, b, actor, `Uyuşmazlık kararı uygulandı: ${decisionText(b)}`, `Uyuşmazlık kararı: ${note}`);
  dd.status = "RESOLVED";
  dd.appealUntil = undefined;
  dd.resolution = { decision: decisionOf(b), refundBps: b, note, at: nowIso(), adminId: actor.role === "ADMIN" ? actor.id : dd.approval?.adminId, via };
  audit(db, actor, "DISPUTE_RESOLVE", dd.id, `${via}: ${decisionText(b)} — ${note}`);
}

function approveInternal(db: Db, dd: Dispute, actor: AnyActor, note: string) {
  dd.approval = { adminId: actor.id, at: nowIso(), note };
  dd.status = "DECIDED";
  dd.appealUntil = new Date(now().getTime() + APPEAL_DAYS * 86400000).toISOString();
  audit(db, actor, "DISPUTE_APPROVE", dd.id, note);
}

export async function openDispute(actor: Actor, input: { txId: string; reason: string; evidence?: unknown }) {
  if (actor.role === "ADMIN") fail("Uyuşmazlığı taraflar açar.", 403);
  const reason = z.string().trim().min(10, "Gerekçe en az 10 karakter olmalı").max(1000).parse(input.reason);
  const res = await mutate((db) => {
    const tx = getTx(db, input.txId);
    assertAccess(tx, actor);
    if (db.disputes.some((d) => d.txId === tx.id && d.status !== "RESOLVED")) fail("Bu işlemde zaten açık bir uyuşmazlık var.", 409);
    transition(db, tx, "DISPUTED", actor, `${actor.role === "CUSTOMER" ? "Müşteri" : "Satıcı"} uyuşmazlık bildirdi`, reason);
    const at = nowIso();
    const d: Dispute = {
      id: nextId(db, "DSP"),
      txId: tx.id,
      openedBy: actor.role,
      openedAt: at,
      reason,
      status: "OPEN",
      respondBy: new Date(now().getTime() + RESPOND_HOURS * 3600000).toISOString(),
      decideBy: addBusinessDays(now(), DECIDE_BUSINESS_DAYS).toISOString(),
      statements: [{ by: actor.role, userId: actor.id, text: reason, at }],
      evidence: [],
      offers: [],
      reviewNotes: [],
    };
    addEvidence(tx, d.evidence, input.evidence, actor.role, at);
    db.disputes.push(d);
    audit(db, actor, "DISPUTE_OPEN", d.id, reason);
    return { disputeId: d.id };
  });
  await notifyDispute(res.disputeId, "Uyuşmazlık bildirildi", `Karşı taraf uyuşmazlık bildirdi. ${RESPOND_HOURS} saat içinde yanıt vermeniz beklenir.`);
  await notifyDispute(res.disputeId, "Yeni uyuşmazlık", "İncelenmeyi bekleyen yeni bir uyuşmazlık var.", ["ADMIN"]);
  return res;
}

export async function addDisputeStatement(actor: Actor, input: { disputeId: string; text: string; evidence?: unknown }) {
  if (actor.role === "ADMIN") fail("Yalnızca taraflar açıklama ekleyebilir.", 403);
  const text = z.string().trim().min(5, "Açıklama en az 5 karakter olmalı").max(1000).parse(input.text);
  const res = await mutate((db) => {
    const d = db.disputes.find((x) => x.id === input.disputeId);
    if (!d) fail("Uyuşmazlık bulunamadı", 404);
    const dd = d as Dispute;
    const tx = getTx(db, dd.txId);
    assertAccess(tx, actor);
    if (dd.status === "RESOLVED") fail("Sonuçlanmış uyuşmazlığa ekleme yapılamaz.", 409);
    const at = nowIso();
    dd.statements.push({ by: actor.role, userId: actor.id, text, at });
    addEvidence(tx, dd.evidence, input.evidence, actor.role, at);
    audit(db, actor, "DISPUTE_STATEMENT", dd.id, "Açıklama/kanıt eklendi");
    return { ok: true };
  });
  await notifyDispute(input.disputeId, "Uyuşmazlığa yeni açıklama", "Karşı taraf uyuşmazlığa açıklama/kanıt ekledi.");
  return res;
}

/** Taraflar: karşılıklı iade oranı teklifi (müzakere). */
export async function makeDisputeOffer(actor: Actor, input: { disputeId: string; refundBps: number }) {
  if (actor.role === "ADMIN") fail("Yalnızca taraflar teklif verebilir.", 403);
  const bps = z.number().int().min(0, "Oran %0–%100 arasında olmalı").max(10000, "Oran %0–%100 arasında olmalı").parse(input.refundBps);
  const res = await mutate((db) => {
    const dd = db.disputes.find((x) => x.id === input.disputeId);
    if (!dd) fail("Uyuşmazlık bulunamadı", 404);
    const d = dd as Dispute;
    assertAccess(getTx(db, d.txId), actor);
    if (d.status === "RESOLVED") fail("Sonuçlanmış uyuşmazlıkta teklif verilemez.", 409);
    d.offers = d.offers ?? [];
    for (const o of d.offers) if (o.by === actor.role && o.status === "PENDING") o.status = "WITHDRAWN";
    d.offers.push({ id: nextId(db, "OFR"), by: actor.role, refundBps: bps, at: nowIso(), status: "PENDING" });
    audit(db, actor, "DISPUTE_OFFER", d.id, `Teklif: ${decisionText(bps)}`);
    return { ok: true };
  });
  await notifyDispute(input.disputeId, "Uyuşmazlıkta yeni teklif", `Karşı taraf bir çözüm teklif etti: ${decisionText(bps)}.`);
  return res;
}

/** Teklif kabul edilirse tutar anında kabul edilen orana göre dağıtılır (platform kararı gerekmez). */
export async function respondDisputeOffer(actor: Actor, input: { disputeId: string; offerId: string; accept: boolean }) {
  if (actor.role === "ADMIN") fail("Yalnızca taraflar teklife yanıt verebilir.", 403);
  const res = await mutate((db) => {
    const dd = db.disputes.find((x) => x.id === input.disputeId);
    if (!dd) fail("Uyuşmazlık bulunamadı", 404);
    const d = dd as Dispute;
    const tx = getTx(db, d.txId);
    assertAccess(tx, actor);
    if (d.status === "RESOLVED") fail("Uyuşmazlık zaten sonuçlanmış.", 409);
    const offer = (d.offers ?? []).find((o) => o.id === input.offerId);
    if (!offer || offer.status !== "PENDING") fail("Teklif bulunamadı veya geçerli değil.", 404);
    const o = offer as NonNullable<typeof offer>;
    if (o.by === actor.role) fail("Kendi teklifinizi kabul/reddedemezsiniz.", 403);
    if (!input.accept) {
      o.status = "REJECTED";
      audit(db, actor, "DISPUTE_OFFER_REJECT", d.id, o.id);
      return { settled: false };
    }
    o.status = "ACCEPTED";
    for (const x of d.offers ?? []) if (x.status === "PENDING") x.status = "WITHDRAWN";
    finalizeDispute(db, tx, d, SYSTEM, "SETTLEMENT", `Taraflar anlaştı: ${decisionText(o.refundBps)}`, { refundBps: o.refundBps });
    return { settled: true };
  });
  await notifyDispute(
    input.disputeId,
    res.settled ? "Uyuşmazlık anlaşmayla sonuçlandı" : "Teklif reddedildi",
    res.settled ? "Taraflar anlaştı; tutar kabul edilen orana göre dağıtıldı." : "Karşı taraf teklifinizi reddetti.",
  );
  return res;
}

/**
 * Yönetici: karar önerisi / ek inceleme / itiraz sonrası nihai karar.
 * Çift onay: öneri, başka bir yönetici onaylayınca (approveDispute) "DECIDED" olur; tek yönetici varsa otomatik onaylanır.
 */
export async function resolveDispute(
  actor: Actor,
  input: { disputeId: string; decision: DisputeDecision | "MORE_REVIEW"; refundBps?: number; note: string },
) {
  if (actor.role !== "ADMIN") fail("Yalnızca admin uyuşmazlık sonuçlandırabilir.", 403);
  const note = z.string().trim().min(5, "Karar notu en az 5 karakter olmalı").max(1000).parse(input.note);
  const res = await mutate((db) => {
    const d = db.disputes.find((x) => x.id === input.disputeId);
    if (!d) fail("Uyuşmazlık bulunamadı", 404);
    const dd = d as Dispute;
    if (dd.status === "RESOLVED") fail("Uyuşmazlık zaten sonuçlandırılmış.", 409);
    if (dd.status === "DECIDED") fail("Karar onaylandı; itiraz süresi sonunda uygulanır.", 409);
    const tx = getTx(db, dd.txId);
    if (input.decision === "MORE_REVIEW") {
      if (dd.status === "OPEN") dd.status = "UNDER_REVIEW";
      dd.reviewNotes.push({ text: note, at: nowIso(), adminId: actor.id });
      audit(db, actor, "DISPUTE_REVIEW", dd.id, note);
      return { status: tx.status, stage: "REVIEW" as const };
    }
    assertNoHold(tx);
    const bps = bpsOf(input.decision, input.refundBps);
    if (dd.status === "APPEAL") {
      assertDistinctAdmin(db, actor, [dd.proposal?.adminId, dd.approval?.adminId]);
      finalizeDispute(db, tx, dd, actor, "APPEAL", note, { refundBps: bps });
      return { status: tx.status, stage: "FINAL" as const };
    }
    if (dd.proposal && dd.proposal.adminId !== actor.id) fail("Bekleyen bir karar önerisi var; onaylayın veya iade edin.", 409);
    dd.proposal = { decision: decisionOf(bps), refundBps: bps, note, adminId: actor.id, at: nowIso() };
    dd.status = "UNDER_REVIEW";
    audit(db, actor, "DISPUTE_PROPOSE", dd.id, `${decisionText(bps)} — ${note}`);
    if (activeAdmins(db).length < 2) {
      approveInternal(db, dd, actor, "Tek yönetici hesabı: çift onay uygulanamadı.");
      return { status: tx.status, stage: "DECIDED" as const, bps };
    }
    return { status: tx.status, stage: "PROPOSED" as const, bps };
  });
  if (res.stage === "DECIDED") await notifyDecision(input.disputeId);
  if (res.stage === "PROPOSED") await notifyDispute(input.disputeId, "Karar önerisi onay bekliyor", "Bir uyuşmazlık karar önerisi ikinci yönetici onayını bekliyor.", ["ADMIN"]);
  if (res.stage === "FINAL") await notifyDispute(input.disputeId, "İtiraz sonucu karar verildi", "İtirazınız incelendi ve nihai platform kararı uygulandı.");
  return res;
}

async function notifyDecision(disputeId: string) {
  const db = await getDb();
  const d = db.disputes.find((x) => x.id === disputeId);
  if (!d?.proposal || !d.appealUntil) return;
  const until = new Date(d.appealUntil).toLocaleDateString("tr-TR");
  await notifyDispute(disputeId, "Uyuşmazlık kararı bildirildi", `Karar: ${decisionText(d.proposal.refundBps)}. ${until} tarihine kadar itiraz edebilirsiniz; itiraz yoksa karar uygulanır.`);
}

/** İkinci yönetici: öneriyi onaylar (itiraz süresi başlar) ya da gerekçeyle iade eder. */
export async function approveDispute(actor: Actor, input: { disputeId: string; approve: boolean; note: string }) {
  if (actor.role !== "ADMIN") fail("Yalnızca admin onaylayabilir.", 403);
  const note = z.string().trim().min(5, "Not en az 5 karakter olmalı").max(1000).parse(input.note);
  const res = await mutate((db) => {
    const d = db.disputes.find((x) => x.id === input.disputeId);
    if (!d) fail("Uyuşmazlık bulunamadı", 404);
    const dd = d as Dispute;
    if (dd.status !== "UNDER_REVIEW" || !dd.proposal) fail("Onay bekleyen bir karar önerisi yok.", 409);
    const prop = dd.proposal as NonNullable<Dispute["proposal"]>;
    assertDistinctAdmin(db, actor, [prop.adminId]);
    if (input.approve) {
      assertNoHold(getTx(db, dd.txId));
      approveInternal(db, dd, actor, note);
    } else {
      dd.reviewNotes.push({ text: `Karar önerisi iade edildi: ${note}`, at: nowIso(), adminId: actor.id });
      dd.proposal = undefined;
      audit(db, actor, "DISPUTE_RETURN", dd.id, note);
    }
    return { approved: input.approve };
  });
  if (res.approved) await notifyDecision(input.disputeId);
  return res;
}

/** Taraflar: karar bildiriminden itibaren 3 gün içinde bir kez itiraz. */
export async function appealDispute(actor: Actor, input: { disputeId: string; reason: string }) {
  if (actor.role === "ADMIN") fail("Yalnızca taraflar itiraz edebilir.", 403);
  const reason = z.string().trim().min(10, "İtiraz gerekçesi en az 10 karakter olmalı").max(1000).parse(input.reason);
  const res = await mutate((db) => {
    const dd = db.disputes.find((x) => x.id === input.disputeId);
    if (!dd) fail("Uyuşmazlık bulunamadı", 404);
    const d = dd as Dispute;
    assertAccess(getTx(db, d.txId), actor);
    if (d.status !== "DECIDED") fail("Şu an itiraz edilebilecek bir karar yok.", 409);
    if (!d.appealUntil || new Date(d.appealUntil).getTime() < now().getTime()) fail("İtiraz süresi dolmuş.", 409);
    if (d.appeal) fail("İtiraz hakkı zaten kullanılmış.", 409);
    const at = nowIso();
    d.appeal = { by: actor.role, reason, at };
    d.statements.push({ by: actor.role, userId: actor.id, text: `İtiraz: ${reason}`, at });
    d.status = "APPEAL";
    d.appealUntil = undefined;
    d.decideBy = addBusinessDays(now(), APPEAL_BUSINESS_DAYS).toISOString();
    audit(db, actor, "DISPUTE_APPEAL", d.id, reason);
    return { ok: true };
  });
  await notifyDispute(input.disputeId, "Karara itiraz edildi", "Karar itiraz nedeniyle yeniden inceleniyor; tutar havuzda bekliyor.");
  await notifyDispute(input.disputeId, "İtiraz geldi", "Bir uyuşmazlık kararına itiraz edildi; farklı bir yönetici incelemelidir.", ["ADMIN"]);
  return res;
}

/* ------------------------------------------------------------------ hukuki blokaj */

/** Mahkeme / icra / savcılık talebi: havuzdaki para hareketi (iade, aktarım, karar uygulaması) durdurulur. */
export async function placeLegalHold(actor: Actor, input: { txId: string; reason: string; reference: string }) {
  if (actor.role !== "ADMIN") fail("Yalnızca admin hukuki blokaj uygulayabilir.", 403);
  const p = z
    .object({ reason: z.string().trim().min(5, "Gerekçe en az 5 karakter olmalı").max(500), reference: z.string().trim().min(2, "Dosya/yazı numarası gerekli").max(100) })
    .parse(input);
  return await mutate((db) => {
    const tx = getTx(db, input.txId);
    if (tx.legalHold) fail("Bu işlemde zaten hukuki blokaj var.", 409);
    if (escrowHeld(db, tx.id) <= 0) fail("Havuzda tutar olmayan işlemde blokaj uygulanamaz.", 409);
    const at = nowIso();
    tx.legalHold = { reason: p.reason, reference: p.reference, at, adminId: actor.id };
    tx.updatedAt = at;
    tx.events.push({ at, label: `Hukuki blokaj uygulandı (${p.reference}): ${p.reason}`, actorRole: "ADMIN", actorId: actor.id, status: tx.status });
    audit(db, actor, "LEGAL_HOLD", tx.id, `${p.reference}: ${p.reason}`);
    return { ok: true };
  });
}

export async function liftLegalHold(actor: Actor, input: { txId: string; note: string }) {
  if (actor.role !== "ADMIN") fail("Yalnızca admin blokajı kaldırabilir.", 403);
  const note = z.string().trim().min(5, "Not en az 5 karakter olmalı").max(500).parse(input.note);
  return await mutate((db) => {
    const tx = getTx(db, input.txId);
    if (!tx.legalHold) fail("Bu işlemde hukuki blokaj yok.", 409);
    const at = nowIso();
    const ref = (tx.legalHold as NonNullable<Transaction["legalHold"]>).reference;
    tx.legalHold = undefined;
    tx.updatedAt = at;
    tx.events.push({ at, label: `Hukuki blokaj kaldırıldı (${ref}): ${note}`, actorRole: "ADMIN", actorId: actor.id, status: tx.status });
    audit(db, actor, "LEGAL_HOLD_LIFT", tx.id, `${ref}: ${note}`);
    return { ok: true };
  });
}

/* ------------------------------------------------------------------ withdrawals */

const ibanRe = /^TR\d{24}$/;

export async function requestWithdrawal(actor: Actor, input: { amount: number; bankName: string; iban: string }) {
  if (actor.role !== "SELLER") fail("Yetkisiz işlem", 403);
  const p = z
    .object({
      amount: z.number().int().positive("Tutar pozitif olmalı"),
      bankName: z.string().trim().min(2, "Banka seçin").max(60),
      iban: z.string(),
    })
    .parse(input);
  const iban = p.iban.replace(/\s/g, "").toUpperCase();
  if (!ibanRe.test(iban)) fail("IBAN, TR ile başlayan 26 karakterli bir değer olmalı.");
  return await mutate((db) => {
    const seller = activeUser(db, actor);
    if (p.amount < db.settings.minWithdrawal) fail(`Minimum çekim tutarı ${db.settings.minWithdrawal / 100} TL`);
    const bal = sellerBalances(db, seller.id);
    if (p.amount > bal.available) fail("Çekilebilir bakiyeniz yetersiz.", 409);
    const w = {
      id: nextId(db, "WDR"),
      sellerId: seller.id,
      amount: p.amount,
      bankName: p.bankName,
      iban,
      status: "PENDING" as const,
      createdAt: nowIso(),
    };
    db.withdrawals.push(w);
    ledger(db, null, "WITHDRAWAL_HOLD", p.amount, "Para çekme talebi — tutar bloke edildi", { sellerId: seller.id, withdrawalId: w.id });
    audit(db, actor, "WITHDRAWAL_REQUEST", w.id, `${p.amount} kuruş`);
    return { id: w.id };
  });
}

export async function decideWithdrawal(actor: Actor, input: { id: string; approve: boolean; note?: string }) {
  if (actor.role !== "ADMIN") fail("Yetkisiz işlem", 403);
  return await mutate((db) => {
    const w = db.withdrawals.find((x) => x.id === input.id);
    if (!w) fail("Talep bulunamadı", 404);
    const ww = w as Db["withdrawals"][number];
    if (ww.status !== "PENDING") fail("Talep zaten sonuçlandırılmış.", 409);
    ww.decidedAt = nowIso();
    ww.adminNote = input.note?.slice(0, 300);
    if (input.approve) {
      ww.status = "APPROVED";
      ledger(db, null, "WITHDRAWAL_PAID", ww.amount, "Ödeme gerçekleştirildi", { sellerId: ww.sellerId, withdrawalId: ww.id });
    } else {
      ww.status = "REJECTED";
      ledger(db, null, "WITHDRAWAL_RELEASE", ww.amount, "Talep reddedildi — bakiye tekrar kullanılabilir", { sellerId: ww.sellerId, withdrawalId: ww.id });
    }
    audit(db, actor, input.approve ? "WITHDRAWAL_APPROVE" : "WITHDRAWAL_REJECT", ww.id, input.note ?? "");
    return { status: ww.status };
  });
}

/* ------------------------------------------------------------------ admin / profile */

export async function setUserActive(actor: Actor, input: { userId: string; active: boolean }) {
  if (actor.role !== "ADMIN") fail("Yetkisiz işlem", 403);
  return await mutate((db) => {
    const u = db.users.find((x) => x.id === input.userId);
    if (!u) fail("Kullanıcı bulunamadı", 404);
    const uu = u as User;
    if (uu.role === "ADMIN") fail("Admin hesapları pasif yapılamaz.", 403);
    uu.active = input.active;
    audit(db, actor, input.active ? "USER_ACTIVATE" : "USER_DEACTIVATE", uu.id, uu.name);
    return { active: uu.active };
  });
}

export async function updateSettings(actor: Actor, input: { buyerFeeBps: number; sellerFeeBps: number; minWithdrawal: number }) {
  if (actor.role !== "ADMIN") fail("Yetkisiz işlem", 403);
  const p = z
    .object({
      buyerFeeBps: z.number().int().min(0).max(2000),
      sellerFeeBps: z.number().int().min(0).max(2000),
      minWithdrawal: z.number().int().min(100).max(100_000_00),
    })
    .parse(input);
  return await mutate((db) => {
    db.settings = p;
    audit(db, actor, "SETTINGS", "settings", JSON.stringify(p));
    return p;
  });
}

export async function updateProfile(
  actor: Actor,
  input: {
    name: string;
    email?: string;
    businessName?: string;
    city?: string;
    bankName?: string;
    iban?: string;
    notif: { sms: boolean; email: boolean; whatsapp: boolean };
  },
) {
  const p = z
    .object({
      name: z.string().trim().min(3).max(80),
      email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
      businessName: z.string().trim().max(80).optional(),
      city: z.string().trim().max(60).optional(),
      bankName: z.string().trim().max(60).optional(),
      iban: z.string().optional(),
      notif: z.object({ sms: z.boolean(), email: z.boolean(), whatsapp: z.boolean() }),
    })
    .parse(input);
  const iban = p.iban?.replace(/\s/g, "").toUpperCase();
  if (iban && !ibanRe.test(iban)) fail("IBAN, TR ile başlayan 26 karakterli bir değer olmalı.");
  return await mutate((db) => {
    const u = activeUser(db, actor);
    if (p.email && db.users.some((x) => x.id !== u.id && x.email === p.email)) fail("Bu e-posta başka bir hesapta kayıtlı.", 409);
    u.name = p.name;
    u.email = p.email || undefined;
    if (u.role === "SELLER") {
      u.businessName = p.businessName || u.businessName;
      u.city = p.city;
      u.bankName = p.bankName;
      u.iban = iban || undefined;
    }
    u.notif = p.notif;
    audit(db, actor, "PROFILE_UPDATE", u.id, "Profil güncellendi");
    return { ok: true };
  });
}
