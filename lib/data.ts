import bcrypt from "bcryptjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Db } from "./types";

/**
 * Supabase (Postgres) veri katmanı.
 *
 * - `getDb()`   : salt-okunur anlık görüntü. `meta.seq` değişmediyse bellekteki kopya kullanılır.
 * - `mutate(fn)`: değişiklikler bir kopya üzerinde yapılır, hata fırlatılırsa hiçbiri yazılmaz;
 *                 başarılıysa fark (diff) `apply_changes()` RPC'siyle tek transaction'da uygulanır.
 *                 Eşzamanlı yazma çakışırsa (CONFLICT) işlem yeniden denenir.
 * Servis katmanındaki iş kuralları (saf, senkron callback'ler) bu sayede değişmeden korunur.
 */

type Row = Record<string, unknown>;

interface TableSpec {
  key: Exclude<keyof Db, "meta" | "settings">;
  table: string;
  ts: string[]; // zaman damgası kolonları (ISO 'Z' biçimine normalize edilir)
  insertOnly: boolean;
}

const TABLES: TableSpec[] = [
  { key: "users", table: "users", ts: ["created_at"], insertOnly: false },
  {
    key: "transactions",
    table: "transactions",
    ts: ["valid_until", "created_at", "updated_at", "secured_at", "buyer_confirmed_at", "seller_confirmed_at", "completed_at"],
    insertOnly: false,
  },
  { key: "payments", table: "payments", ts: ["at"], insertOnly: true },
  { key: "withdrawals", table: "withdrawals", ts: ["created_at", "decided_at"], insertOnly: false },
  { key: "ledger", table: "ledger", ts: ["at"], insertOnly: true },
  { key: "disputes", table: "disputes", ts: ["opened_at"], insertOnly: false },
  { key: "audit", table: "audit", ts: ["at"], insertOnly: true },
];

const g = globalThis as unknown as { __ekSb?: SupabaseClient; __ekCache?: { seq: number; db: Db } };

function client(): SupabaseClient {
  if (g.__ekSb) return g.__ekSb;
  const raw = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!raw || !key) throw new Error("SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanımlı olmalı.");
  // Panelden kopyalanan adres "/rest/v1/" gibi bir yol içerebilir; yalnızca kök adres gerekir.
  const url = new URL(raw).origin;
  g.__ekSb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
  return g.__ekSb;
}

/** Ham Supabase istemcisi (Db dışındaki tablolar, ör. password_resets, için). */
export function supabase(): SupabaseClient {
  return client();
}

/* ------------------------------------------------------------ satır dönüşümleri */

const toSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const toCamel = (s: string) => s.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

function toRow(obj: object): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(obj)) out[toSnake(k)] = v === undefined ? null : v;
  return out;
}

function fromRow(row: Row, spec: TableSpec): unknown {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null) continue; // null → alan yok (opsiyonel alan semantiği)
    out[toCamel(k)] = spec.ts.includes(k) ? new Date(v as string).toISOString() : v;
  }
  return out;
}

/* ------------------------------------------------------------ okuma */

async function fetchAll(table: string): Promise<Row[]> {
  const sb = client();
  const rows: Row[] = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await sb.from(table).select("*").order("id").range(from, from + page - 1);
    if (error) throw new Error(`Supabase okuma hatası (${table}): ${error.message}`);
    rows.push(...(data as Row[]));
    if (!data || data.length < page) break;
  }
  return rows;
}

async function readSeq(): Promise<number> {
  const { data, error } = await client().from("meta").select("seq").eq("id", 1).single();
  if (error) throw new Error(`Supabase okuma hatası (meta): ${error.message}`);
  return Number(data.seq);
}

async function loadAll(): Promise<{ seq: number; db: Db }> {
  const sb = client();
  const seq = await readSeq();
  const [meta, settings, ...tables] = await Promise.all([
    sb.from("meta").select("*").eq("id", 1).single(),
    sb.from("settings").select("*").eq("id", 1).single(),
    ...TABLES.map((t) => fetchAll(t.table)),
  ]);
  if (meta.error || settings.error) throw new Error("Supabase okuma hatası (meta/settings)");
  const db = {
    meta: { seq: Number(meta.data.seq), idSeq: Number(meta.data.id_seq) },
    settings: {
      buyerFeeBps: settings.data.buyer_fee_bps,
      sellerFeeBps: settings.data.seller_fee_bps,
      minWithdrawal: Number(settings.data.min_withdrawal),
    },
  } as Db;
  TABLES.forEach((spec, i) => {
    (db as unknown as Record<string, unknown>)[spec.key] = (tables[i] as Row[]).map((r) => fromRow(r, spec));
  });
  return { seq, db };
}

async function snapshot(force = false): Promise<{ seq: number; db: Db }> {
  const cached = g.__ekCache;
  if (!force && cached && cached.seq === (await readSeq())) return cached;
  let fresh = await loadAll();
  if (fresh.db.users.length === 0 && (await bootstrapAdmin())) fresh = await loadAll();
  g.__ekCache = fresh;
  return fresh;
}

/** Salt-okunur erişim. Çağıran nesneyi DEĞİŞTİRMEMELİDİR. */
export async function getDb(): Promise<Db> {
  return (await snapshot()).db;
}

/* ------------------------------------------------------------ yazma */

function diff(before: Db, after: Db) {
  const upsert: Record<string, Row[]> = {};
  for (const spec of TABLES) {
    const old = new Map<string, string>();
    for (const r of before[spec.key] as unknown as { id: string }[]) old.set(r.id, JSON.stringify(toRow(r)));
    const changed: Row[] = [];
    for (const r of after[spec.key] as unknown as { id: string }[]) {
      const row = toRow(r);
      const prev = old.get(r.id);
      if (prev === undefined) changed.push(row);
      else if (!spec.insertOnly && prev !== JSON.stringify(row)) changed.push(row);
    }
    if (changed.length) upsert[spec.table] = changed;
  }
  return upsert;
}

function isConflict(e: { code?: string; message?: string } | null) {
  return !!e && (e.code === "40001" || /CONFLICT/.test(e.message ?? ""));
}

async function commit(base: { seq: number; db: Db }, draft: Db): Promise<boolean> {
  const payload = {
    expected_seq: base.seq,
    meta: { id_seq: draft.meta.idSeq },
    settings: {
      buyer_fee_bps: draft.settings.buyerFeeBps,
      seller_fee_bps: draft.settings.sellerFeeBps,
      min_withdrawal: draft.settings.minWithdrawal,
    },
    upsert: diff(base.db, draft),
  };
  const { error } = await client().rpc("apply_changes", { p: payload });
  if (isConflict(error)) return false;
  if (error) throw new Error(`Supabase yazma hatası: ${error.message}`);
  g.__ekCache = { seq: base.seq + 1, db: draft };
  return true;
}

export async function mutate<T>(fn: (db: Db) => T): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const base = await snapshot(attempt > 0);
    const draft = structuredClone(base.db);
    const result = fn(draft); // hata fırlatırsa hiçbir şey yazılmaz
    if (await commit(base, draft)) return result;
  }
  throw new Error("Eşzamanlı yazma çakışması: işlem tamamlanamadı, lütfen tekrar deneyin.");
}

/* ------------------------------------------------------------ ilk kurulum */

/**
 * Veritabanı boşsa ADMIN_EMAIL / ADMIN_PASSWORD ortam değişkenlerinden ilk yöneticiyi oluşturur.
 * Tanımlı değillerse hiçbir şey yapmaz (kullanıcı oluşturulmaz).
 */
async function bootstrapAdmin(): Promise<boolean> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 10) return false;
  const base = await loadAll();
  if (base.db.users.length > 0) return false;
  const draft = structuredClone(base.db);
  const id = `USR-${String(draft.meta.idSeq++).padStart(5, "0")}`;
  const at = new Date().toISOString();
  draft.users.push({
    id,
    role: "ADMIN",
    name: "Platform Yöneticisi",
    email,
    phone: "5559999999",
    passwordHash: bcrypt.hashSync(password, 10),
    active: true,
    createdAt: at,
    notif: { sms: false, email: true, whatsapp: false },
  });
  draft.audit.push({
    id: `LOG-${String(draft.meta.idSeq++).padStart(5, "0")}`,
    at,
    actorId: "SYSTEM",
    actorRole: "SYSTEM",
    action: "BOOTSTRAP",
    entityId: id,
    detail: "İlk yönetici hesabı oluşturuldu",
  });
  await commit(base, draft); // çakışırsa başka bir istek zaten oluşturmuştur
  return true;
}
