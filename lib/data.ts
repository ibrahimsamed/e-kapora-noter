import fs from "node:fs";
import path from "node:path";
import type { Db } from "./types";

/**
 * DEMO veri katmanı: sunucu belleğinde tutulan, JSON dosyasına yazılan basit bir depo.
 * `mutate()` bir işlem (transaction) gibi çalışır: değişiklikler bir kopya üzerinde yapılır,
 * hata fırlatılırsa hiçbiri uygulanmaz; başarılı olursa atomik olarak yazılır.
 * Üretimde bu katman PostgreSQL (Prisma) ile değiştirilecek şekilde tek noktada tutulmuştur.
 */

// Vercel'de dosya sistemi salt okunurdur; yalnızca /tmp yazılabilir (geçici, instance başına).
const FILE =
  process.env.DATA_FILE ??
  (process.env.VERCEL ? "/tmp/ekapora-db.json" : path.join(process.cwd(), "data", "db.json"));

const g = globalThis as unknown as { __ekdb?: Db; __ekPersist?: boolean };

export function emptyDb(): Db {
  return {
    meta: { seq: 100, idSeq: 1 },
    settings: { buyerFeeBps: 200, sellerFeeBps: 200, minWithdrawal: 10000 },
    users: [],
    transactions: [],
    payments: [],
    ledger: [],
    withdrawals: [],
    disputes: [],
    audit: [],
  };
}

function persist(db: Db) {
  if (g.__ekPersist === false) return;
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, FILE);
}

export function suspendPersist(v: boolean) {
  g.__ekPersist = !v;
}

export function setDb(db: Db) {
  g.__ekdb = db;
}

export function flush() {
  if (g.__ekdb) {
    g.__ekPersist = true;
    persist(g.__ekdb);
  }
}

/** Salt-okunur erişim. Çağıran nesneyi DEĞİŞTİRMEMELİDİR. */
export function getDb(): Db {
  if (!g.__ekdb) {
    if (fs.existsSync(/*turbopackIgnore: true*/ FILE)) {
      g.__ekdb = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ FILE, "utf8")) as Db;
    } else {
      g.__ekdb = emptyDb();
      // dairesel import'u çalışma zamanına ertele
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { seedDemo } = require("./seed") as typeof import("./seed");
      seedDemo();
    }
  }
  return g.__ekdb;
}

export function mutate<T>(fn: (db: Db) => T): T {
  const current = getDb();
  const draft = structuredClone(current);
  const result = fn(draft); // hata fırlatırsa current değişmez
  g.__ekdb = draft;
  persist(draft);
  return result;
}

export function resetDb() {
  g.__ekdb = undefined;
  try {
    fs.unlinkSync(FILE);
  } catch {}
}
