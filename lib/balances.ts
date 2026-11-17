import type { Db, LedgerKind } from "./types";

/** Bakiyeler YALNIZCA ledger'dan (ve işlem durumlarından) hesaplanır; tamsayı kuruş. */

function sum(db: Db, kind: LedgerKind, pred: (l: Db["ledger"][number]) => boolean = () => true) {
  let t = 0;
  for (const l of db.ledger) if (l.kind === kind && pred(l)) t += l.amount;
  return t;
}

/** Bir işlemin güvenli havuzda tuttuğu tutar */
export function escrowHeld(db: Db, txId: string): number {
  let held = 0;
  for (const l of db.ledger) {
    if (l.txId !== txId) continue;
    if (l.kind === "PAYMENT") held += l.amount;
    else if (l.kind === "RELEASE_SELLER" || l.kind === "COMMISSION" || l.kind === "REFUND") held -= l.amount;
  }
  return held;
}

export interface SellerBalances {
  secured: number; // güvence altındaki (kapora)
  available: number; // çekilebilir
  pendingRefund: number;
  pendingWithdrawal: number;
  totalCommission: number; // satıcının ödediği komisyon
  totalEarnings: number; // satıcıya aktarılan net toplam
}

export function sellerBalances(db: Db, sellerId: string): SellerBalances {
  const mine = db.transactions.filter((t) => t.sellerId === sellerId);
  let secured = 0;
  let pendingRefund = 0;
  let totalCommission = 0;
  for (const t of mine) {
    const held = escrowHeld(db, t.id);
    if (held > 0) {
      if (t.status === "CANCELLATION_REQUESTED" || t.status === "REFUND_PROCESSING") pendingRefund += t.deposit;
      else secured += t.deposit;
    }
    if (t.status === "COMPLETED") totalCommission += t.sellerFee;
  }
  const own = (l: Db["ledger"][number]) => l.sellerId === sellerId;
  const totalEarnings = sum(db, "RELEASE_SELLER", own);
  const holds = sum(db, "WITHDRAWAL_HOLD", own);
  const released = sum(db, "WITHDRAWAL_RELEASE", own);
  const pendingWithdrawal = db.withdrawals
    .filter((w) => w.sellerId === sellerId && w.status === "PENDING")
    .reduce((a, w) => a + w.amount, 0);
  return {
    secured,
    available: totalEarnings - holds + released,
    pendingRefund,
    pendingWithdrawal,
    totalCommission,
    totalEarnings,
  };
}

export function customerBalances(db: Db, customerId: string) {
  const own = (l: Db["ledger"][number]) => l.customerId === customerId;
  const totalPaid = sum(db, "PAYMENT", own);
  const totalRefunded = sum(db, "REFUND", own);
  let secured = 0;
  for (const t of db.transactions) if (t.customerId === customerId) secured += Math.max(0, escrowHeld(db, t.id));
  return { totalPaid, totalRefunded, secured };
}

export function platformBalances(db: Db) {
  let secured = 0;
  for (const t of db.transactions) secured += Math.max(0, escrowHeld(db, t.id));
  return {
    secured,
    commission: sum(db, "COMMISSION"),
    paymentVolume: sum(db, "PAYMENT"),
    refunded: sum(db, "REFUND"),
    withdrawalsPaid: sum(db, "WITHDRAWAL_PAID"),
  };
}

/** Defter tutarlılık kontrolü: havuz hiçbir zaman negatif olamaz ve toplam eşitliği tutar. */
export function verifyLedger(db: Db): string[] {
  const errors: string[] = [];
  for (const t of db.transactions) {
    const h = escrowHeld(db, t.id);
    if (h < 0) errors.push(`${t.id}: negatif havuz (${h})`);
    if (t.status === "COMPLETED" || t.status === "REFUNDED") {
      if (h !== 0) errors.push(`${t.id}: kapanmış işlemde havuz bakiyesi ${h}`);
    }
    const refunds = db.ledger.filter((l) => l.txId === t.id && l.kind === "REFUND").length;
    if (refunds > 1) errors.push(`${t.id}: birden fazla iade`);
  }
  return errors;
}
