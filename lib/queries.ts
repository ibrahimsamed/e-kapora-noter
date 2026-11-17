import { getDb } from "./data";
import { sweepExpired } from "./services";
import { now } from "./clock";
import { customerBalances, escrowHeld, platformBalances, sellerBalances } from "./balances";
import { STATUS_META, ALL_STATUSES } from "./workflow";
import type { Db, Dispute, LedgerEntry, Payment, Transaction, TxStatus, User } from "./types";

/** Okuma girişi: süresi dolan işlemleri süpürür, sonra salt-okunur db döndürür. */
export function readDb(): Db {
  sweepExpired();
  return getDb();
}

/** Hassas alanlar (parola hash'i) hiçbir zaman istemciye gitmez. */
export interface PublicUser {
  id: string;
  role: User["role"];
  name: string;
  businessName?: string;
  email?: string;
  phone: string;
  active: boolean;
  createdAt: string;
  city?: string;
  bankName?: string;
  iban?: string;
  notif: User["notif"];
}
export function publicUser(u: User): PublicUser {
  const { passwordHash, ...rest } = u;
  void passwordHash;
  return rest;
}

export interface TxRow {
  id: string;
  title: string;
  category: Transaction["category"];
  status: TxStatus;
  sellerId: string;
  sellerName: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  deposit: number;
  buyerFee: number;
  sellerFee: number;
  createdAt: string;
  updatedAt: string;
  serviceDate: string;
  validUntil: string;
  held: number;
}

export function toRow(db: Db, t: Transaction): TxRow {
  const s = db.users.find((u) => u.id === t.sellerId);
  const c = db.users.find((u) => u.id === t.customerId);
  return {
    id: t.id,
    title: t.title,
    category: t.category,
    status: t.status,
    sellerId: t.sellerId,
    sellerName: s?.businessName ?? s?.name ?? "—",
    customerId: t.customerId,
    customerName: c?.name ?? "—",
    customerPhone: c?.phone ?? "",
    totalAmount: t.totalAmount,
    deposit: t.deposit,
    buyerFee: t.buyerFee,
    sellerFee: t.sellerFee,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    serviceDate: t.serviceDate,
    validUntil: t.validUntil,
    held: Math.max(0, escrowHeld(db, t.id)),
  };
}

export function rowsFor(db: Db, role: User["role"], userId: string): TxRow[] {
  const list = db.transactions.filter((t) =>
    role === "ADMIN" ? true : role === "SELLER" ? t.sellerId === userId : t.customerId === userId,
  );
  return list.map((t) => toRow(db, t)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface TxDetailData {
  tx: Transaction;
  seller: PublicUser;
  customer: PublicUser;
  payments: Payment[];
  ledger: LedgerEntry[];
  dispute?: Dispute;
  held: number;
}

export function txDetail(db: Db, id: string, role: User["role"], userId: string): TxDetailData | null {
  const tx = db.transactions.find((t) => t.id === id);
  if (!tx) return null;
  if (role === "SELLER" && tx.sellerId !== userId) return null;
  if (role === "CUSTOMER" && tx.customerId !== userId) return null;
  const seller = db.users.find((u) => u.id === tx.sellerId);
  const customer = db.users.find((u) => u.id === tx.customerId);
  if (!seller || !customer) return null;
  const disputes = db.disputes.filter((d) => d.txId === tx.id);
  return {
    tx,
    seller: publicUser(seller),
    customer: publicUser(customer),
    payments: db.payments.filter((p) => p.txId === tx.id),
    ledger: db.ledger.filter((l) => l.txId === tx.id),
    dispute: disputes[disputes.length - 1],
    held: Math.max(0, escrowHeld(db, tx.id)),
  };
}

/* ------------------------------------------------------------ seller stats */

const TZ = "Europe/Istanbul";
const dayKey = (iso: string | Date) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
const monthKey = (iso: string | Date) => dayKey(iso).slice(0, 7);
const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

function lastMonths(n: number) {
  const d = now();
  const out: { key: string; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1, 12);
    const key = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
    out.push({ key, label: `${MONTHS[x.getMonth()]} ${String(x.getFullYear()).slice(2)}` });
  }
  return out;
}

export function statusDistribution(list: Transaction[]) {
  return ALL_STATUSES.map((s) => ({
    status: s,
    name: STATUS_META[s].label,
    value: list.filter((t) => t.status === s).length,
    color: STATUS_META[s].hex,
  })).filter((x) => x.value > 0);
}

function monthlyVolume(list: Transaction[], n = 6) {
  return lastMonths(n).map((m) => ({
    name: m.label,
    hacim: list
      .filter((t) => t.status !== "CANCELLED" && t.status !== "EXPIRED" && monthKey(t.createdAt) === m.key)
      .reduce((a, t) => a + t.totalAmount, 0) / 100,
  }));
}

function dailyCount(list: Transaction[], days = 14) {
  const out: { name: string; adet: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now().getTime() - i * 86400000);
    const k = dayKey(d);
    out.push({
      name: d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", timeZone: TZ }),
      adet: list.filter((t) => dayKey(t.createdAt) === k).length,
    });
  }
  return out;
}

export function sellerStats(db: Db, sellerId: string) {
  const mine = db.transactions.filter((t) => t.sellerId === sellerId);
  const bal = sellerBalances(db, sellerId);
  const completed = mine.filter((t) => t.status === "COMPLETED");
  return {
    totalTx: mine.length,
    volume: mine.filter((t) => t.status !== "CANCELLED" && t.status !== "EXPIRED").reduce((a, t) => a + t.totalAmount, 0),
    pending: mine.filter((t) => t.status === "WAITING_FOR_PAYMENT").length,
    bal,
    monthlyVolume: monthlyVolume(mine),
    dailyCount: dailyCount(mine),
    distribution: statusDistribution(mine),
    monthlyCommission: lastMonths(6).map((m) => ({
      name: m.label,
      komisyon:
        completed
          .filter((t) => t.completedAt && monthKey(t.completedAt) === m.key)
          .reduce((a, t) => a + t.sellerFee, 0) / 100,
    })),
    monthlyEarnings: lastMonths(6).map((m) => ({
      name: m.label,
      kazanc:
        completed
          .filter((t) => t.completedAt && monthKey(t.completedAt) === m.key)
          .reduce((a, t) => a + t.deposit - t.sellerFee, 0) / 100,
    })),
  };
}

export function customerStats(db: Db, customerId: string) {
  const mine = db.transactions.filter((t) => t.customerId === customerId);
  const b = customerBalances(db, customerId);
  return {
    ...b,
    completed: mine.filter((t) => t.status === "COMPLETED").length,
    pending: mine.filter((t) => t.status === "WAITING_FOR_PAYMENT").length,
    total: mine.length,
  };
}

export function adminStats(db: Db) {
  const p = platformBalances(db);
  const real = db.transactions.filter((t) => t.status !== "CANCELLED" && t.status !== "EXPIRED");
  return {
    users: db.users.filter((u) => u.role !== "ADMIN").length,
    sellers: db.users.filter((u) => u.role === "SELLER").length,
    customers: db.users.filter((u) => u.role === "CUSTOMER").length,
    totalTx: db.transactions.length,
    volume: real.reduce((a, t) => a + t.totalAmount, 0),
    secured: p.secured,
    commission: p.commission,
    pendingRefunds: db.transactions.filter((t) => t.status === "REFUND_PROCESSING" || t.status === "CANCELLATION_REQUESTED").length,
    pendingWithdrawals: db.withdrawals.filter((w) => w.status === "PENDING").length,
    openDisputes: db.disputes.filter((d) => d.status !== "RESOLVED").length,
    monthlyVolume: monthlyVolume(db.transactions),
    dailyCount: dailyCount(db.transactions),
    distribution: statusDistribution(db.transactions),
    monthlyCommission: lastMonths(6).map((m) => ({
      name: m.label,
      komisyon:
        db.ledger.filter((l) => l.kind === "COMMISSION" && monthKey(l.at) === m.key).reduce((a, l) => a + l.amount, 0) / 100,
    })),
  };
}
