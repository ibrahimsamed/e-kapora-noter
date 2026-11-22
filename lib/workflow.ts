import type { ActorRole, Category, TxStatus } from "./types";

export interface StatusMeta {
  label: string;
  /** Tailwind sınıfları (rozet) */
  badge: string;
  dot: string;
  hex: string;
  description: string;
}

export const STATUS_META: Record<TxStatus, StatusMeta> = {
  CREATED: { label: "Oluşturuldu", badge: "bg-slate-100 text-slate-700 ring-slate-200", dot: "bg-slate-400", hex: "#94a3b8", description: "İşlem kaydı oluşturuldu." },
  WAITING_FOR_PAYMENT: { label: "Ödeme Bekleniyor", badge: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500", hex: "#f59e0b", description: "Müşterinin ödeme yapması bekleniyor." },
  PAYMENT_PROCESSING: { label: "Ödeme İşleniyor", badge: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500", hex: "#0ea5e9", description: "Ödeme doğrulanıyor (havale bildirimi admin onayı bekliyor)." },
  SECURED: { label: "Güvence Altında", badge: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500", hex: "#16a36a", description: "Kapora güvenli havuzda tutuluyor." },
  WAITING_FOR_CONFIRMATION: { label: "Onay Bekleniyor", badge: "bg-blue-50 text-blue-800 ring-blue-200", dot: "bg-blue-500", hex: "#2864dc", description: "Taraflardan biri onayladı, diğer onay bekleniyor." },
  COMPLETED: { label: "Tamamlandı", badge: "bg-green-100 text-green-800 ring-green-300", dot: "bg-green-600", hex: "#15803d", description: "İki taraf onayladı, tutar satıcıya aktarıldı." },
  CANCELLATION_REQUESTED: { label: "İptal Talebi", badge: "bg-orange-50 text-orange-800 ring-orange-200", dot: "bg-orange-500", hex: "#f97316", description: "İptal talebi karşı tarafın yanıtını bekliyor." },
  REFUND_PROCESSING: { label: "İade İşleniyor", badge: "bg-violet-50 text-violet-800 ring-violet-200", dot: "bg-violet-500", hex: "#8b5cf6", description: "İade süreci başlatıldı." },
  REFUNDED: { label: "İade Edildi", badge: "bg-purple-100 text-purple-800 ring-purple-300", dot: "bg-purple-600", hex: "#7e22ce", description: "Ödeme müşteriye iade edildi." },
  DISPUTED: { label: "Uyuşmazlık", badge: "bg-red-50 text-red-800 ring-red-200", dot: "bg-red-500", hex: "#ef4444", description: "Admin incelemesi bekleniyor." },
  EXPIRED: { label: "Süresi Doldu", badge: "bg-gray-100 text-gray-600 ring-gray-200", dot: "bg-gray-400", hex: "#9ca3af", description: "Geçerlilik süresi içinde ödeme yapılmadı." },
  CANCELLED: { label: "İptal Edildi", badge: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-400", hex: "#fb7185", description: "İşlem ödeme alınmadan iptal edildi." },
};

export const ALL_STATUSES = Object.keys(STATUS_META) as TxStatus[];

/** Durum makinesi: from -> to -> bu geçişi yapabilecek roller */
export const TRANSITIONS: Record<TxStatus, Partial<Record<TxStatus, ActorRole[]>>> = {
  CREATED: {
    WAITING_FOR_PAYMENT: ["SELLER", "SYSTEM"],
    CANCELLED: ["SELLER", "ADMIN"],
  },
  WAITING_FOR_PAYMENT: {
    PAYMENT_PROCESSING: ["CUSTOMER", "SYSTEM"],
    CANCELLED: ["SELLER", "CUSTOMER", "ADMIN"],
    EXPIRED: ["SYSTEM", "ADMIN"],
  },
  PAYMENT_PROCESSING: {
    SECURED: ["SYSTEM", "ADMIN"],
    WAITING_FOR_PAYMENT: ["SYSTEM", "ADMIN"],
  },
  SECURED: {
    WAITING_FOR_CONFIRMATION: ["CUSTOMER", "SELLER"],
    CANCELLATION_REQUESTED: ["CUSTOMER", "ADMIN"],
    REFUND_PROCESSING: ["SELLER", "ADMIN"],
    DISPUTED: ["CUSTOMER", "SELLER", "ADMIN"],
  },
  WAITING_FOR_CONFIRMATION: {
    COMPLETED: ["CUSTOMER", "SELLER"],
    CANCELLATION_REQUESTED: ["CUSTOMER", "ADMIN"],
    REFUND_PROCESSING: ["SELLER", "ADMIN"],
    DISPUTED: ["CUSTOMER", "SELLER", "ADMIN"],
  },
  CANCELLATION_REQUESTED: {
    REFUND_PROCESSING: ["SELLER", "ADMIN"],
    SECURED: ["SELLER", "ADMIN"],
    WAITING_FOR_CONFIRMATION: ["SELLER", "ADMIN"],
    DISPUTED: ["CUSTOMER", "SELLER", "ADMIN"],
  },
  REFUND_PROCESSING: {
    REFUNDED: ["SELLER", "ADMIN", "SYSTEM"],
  },
  DISPUTED: {
    REFUNDED: ["ADMIN", "SYSTEM"],
    COMPLETED: ["ADMIN", "SYSTEM"],
  },
  COMPLETED: {},
  REFUNDED: {},
  EXPIRED: {},
  CANCELLED: {},
};

export const TERMINAL: TxStatus[] = ["COMPLETED", "REFUNDED", "EXPIRED", "CANCELLED"];
/** Güvenli havuzda para bulunabilecek durumlar */
export const ESCROW_STATES: TxStatus[] = [
  "SECURED",
  "WAITING_FOR_CONFIRMATION",
  "CANCELLATION_REQUESTED",
  "REFUND_PROCESSING",
  "DISPUTED",
];

export function canTransition(from: TxStatus, to: TxStatus, role: ActorRole): boolean {
  return TRANSITIONS[from]?.[to]?.includes(role) ?? false;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  PRODUCT: "Ürün Satışı",
  VEHICLE_SALE: "Araç Satışı",
  VEHICLE_RENTAL: "Araç Kiralama",
  VILLA_RENTAL: "Ev / Villa Kiralama",
  HOTEL: "Otel / Konaklama",
  EVENT: "Organizasyon",
  SERVICE: "Hizmet Alımı",
  OTHER: "Diğer",
};
export const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];

export const CANCEL_POLICIES = [
  { key: "flex", label: "Esnek", text: "Hizmet/teslimat tarihinden 7 gün öncesine kadar yapılan iptallerde kaporanın tamamı iade edilir." },
  { key: "mid", label: "Orta", text: "Hizmet/teslimat tarihinden 14 gün öncesine kadar yapılan iptallerde kaporanın %50'si iade edilir; sonrasında iade yapılmaz." },
  { key: "strict", label: "Katı", text: "Kapora iade edilmez; yalnızca satıcının hizmeti sağlayamaması halinde tam iade yapılır." },
];

export const ROLE_LABEL: Record<ActorRole, string> = {
  CUSTOMER: "Müşteri",
  SELLER: "Satıcı",
  ADMIN: "Admin",
  SYSTEM: "Sistem",
};

export const LEDGER_LABEL: Record<string, string> = {
  PAYMENT: "Ödeme (güvenli havuza)",
  RELEASE_SELLER: "Satıcıya aktarım",
  COMMISSION: "Platform komisyonu",
  REFUND: "Müşteriye iade",
  WITHDRAWAL_HOLD: "Çekim talebi (bloke)",
  WITHDRAWAL_PAID: "Çekim ödemesi",
  WITHDRAWAL_RELEASE: "Çekim reddi (bakiye iadesi)",
};
