export type Role = "CUSTOMER" | "SELLER" | "ADMIN";
export type ActorRole = Role | "SYSTEM";

export type TxStatus =
  | "CREATED"
  | "WAITING_FOR_PAYMENT"
  | "PAYMENT_PROCESSING"
  | "SECURED"
  | "WAITING_FOR_CONFIRMATION"
  | "COMPLETED"
  | "CANCELLATION_REQUESTED"
  | "REFUND_PROCESSING"
  | "REFUNDED"
  | "DISPUTED"
  | "EXPIRED"
  | "CANCELLED";

export type Category =
  | "PRODUCT"
  | "VEHICLE_SALE"
  | "VEHICLE_RENTAL"
  | "VILLA_RENTAL"
  | "HOTEL"
  | "EVENT"
  | "SERVICE"
  | "OTHER";

export interface User {
  id: string;
  role: Role;
  name: string;
  businessName?: string;
  email?: string;
  phone: string; // 10 hane, ör. 5550000001
  passwordHash?: string;
  active: boolean;
  createdAt: string;
  city?: string;
  bankName?: string;
  iban?: string; // yalnızca demo IBAN
  notif: { sms: boolean; email: boolean; whatsapp: boolean };
}

export interface TimelineEvent {
  at: string;
  label: string;
  actorRole: ActorRole;
  actorId: string;
  status: TxStatus;
}

export interface Transaction {
  id: string;
  sellerId: string;
  customerId: string;
  category: Category;
  title: string;
  description: string;
  totalAmount: number; // kuruş
  deposit: number; // kuruş
  buyerFeeBps: number;
  sellerFeeBps: number;
  buyerFee: number; // kuruş
  sellerFee: number; // kuruş
  serviceDate: string;
  validUntil: string;
  cancelPolicy: string;
  refundPolicy: string;
  deliveryTerms: string;
  extraNotes: string;
  status: TxStatus;
  prevStatus?: TxStatus;
  createdAt: string;
  updatedAt: string;
  securedAt?: string;
  buyerConfirmedAt?: string;
  sellerConfirmedAt?: string;
  completedAt?: string;
  cancelRequest?: { by: Role; reason: string; at: string };
  refund?: { amount: number; at: string; reason: string; by: ActorRole };
  closeReason?: string;
  events: TimelineEvent[];
  documents: { name: string; at: string; by: Role }[];
}

export interface Payment {
  id: string;
  txId: string;
  amount: number;
  cardLast4: string;
  status: "SUCCESS" | "FAILED";
  failReason?: string;
  at: string;
  idemKey: string;
}

export type LedgerKind =
  | "PAYMENT" // alıcıdan güvenli havuza (kapora + alıcı komisyonu)
  | "RELEASE_SELLER" // havuzdan satıcı bakiyesine (kapora - satıcı komisyonu)
  | "COMMISSION" // havuzdan platforma (alıcı + satıcı komisyonu)
  | "REFUND" // havuzdan alıcıya iade
  | "WITHDRAWAL_HOLD" // çekim talebi: bakiye bloke
  | "WITHDRAWAL_PAID" // admin onayı: demo ödeme
  | "WITHDRAWAL_RELEASE"; // red: bakiye geri

export interface LedgerEntry {
  id: string;
  at: string;
  kind: LedgerKind;
  amount: number; // her zaman pozitif kuruş
  txId?: string;
  sellerId?: string;
  customerId?: string;
  withdrawalId?: string;
  note: string;
}

export interface Withdrawal {
  id: string;
  sellerId: string;
  amount: number;
  bankName: string;
  iban: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  decidedAt?: string;
  adminNote?: string;
}

export interface Dispute {
  id: string;
  txId: string;
  openedBy: Role;
  openedAt: string;
  reason: string;
  status: "OPEN" | "UNDER_REVIEW" | "RESOLVED";
  statements: { by: Role; userId: string; text: string; at: string }[];
  evidence: { name: string; sizeKb: number; by: Role; at: string }[];
  resolution?: {
    decision: "REFUND_BUYER" | "PAY_SELLER";
    note: string;
    at: string;
    adminId: string;
  };
  reviewNotes: { text: string; at: string; adminId: string }[];
}

export interface AuditLog {
  id: string;
  at: string;
  actorId: string;
  actorRole: ActorRole;
  action: string;
  entityId: string;
  detail: string;
}

export interface Settings {
  buyerFeeBps: number;
  sellerFeeBps: number;
  minWithdrawal: number; // kuruş
}

export interface Db {
  meta: { seq: number; idSeq: number };
  settings: Settings;
  users: User[];
  transactions: Transaction[];
  payments: Payment[];
  ledger: LedgerEntry[];
  withdrawals: Withdrawal[];
  disputes: Dispute[];
  audit: AuditLog[];
}

export interface Actor {
  id: string;
  role: Role;
}
