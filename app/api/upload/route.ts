import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { currentActor } from "@/lib/session";
import { getDb, supabase } from "@/lib/data";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "text/plain": "txt",
  "video/mp4": "mp4",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};
/** Kanıt yüklenebilen işlem durumları. */
const OPEN_STATES = ["SECURED", "WAITING_FOR_CONFIRMATION", "CANCELLATION_REQUESTED", "DISPUTED"];

/** Uyuşmazlık kanıtı yükleme: dosya özel depoya yazılır, SHA-256 özeti döner. */
export async function POST(req: Request) {
  const actor = await currentActor();
  if (!actor) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  if (actor.role === "ADMIN") return NextResponse.json({ error: "Kanıtı taraflar yükler." }, { status: 403 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const txId = String(form.get("txId") ?? "");
  const file = form.get("file");
  if (!txId || !(file instanceof File)) return NextResponse.json({ error: "İşlem ve dosya gerekli." }, { status: 400 });

  const db = await getDb();
  const tx = db.transactions.find((t) => t.id === txId);
  const mine = tx && (actor.role === "SELLER" ? tx.sellerId === actor.id : tx.customerId === actor.id);
  if (!tx || !mine) return NextResponse.json({ error: "İşlem bulunamadı" }, { status: 404 });
  if (!OPEN_STATES.includes(tx.status)) return NextResponse.json({ error: "Bu işlem için kanıt yüklenemez." }, { status: 409 });

  if (file.size === 0 || file.size > MAX_BYTES) return NextResponse.json({ error: "Dosya 8 MB'dan küçük olmalı." }, { status: 413 });
  const ext = ALLOWED[file.type];
  if (!ext) return NextResponse.json({ error: "Desteklenen türler: PDF, JPG, PNG, WEBP, MP4, TXT, DOC(X)." }, { status: 415 });

  const buf = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(buf).digest("hex");
  const path = `${tx.id}/${randomUUID()}.${ext}`;
  const { error } = await supabase().storage.from("evidence").upload(path, buf, { contentType: file.type, upsert: false });
  if (error) {
    console.error("[upload] depolama hatası");
    return NextResponse.json({ error: "Dosya yüklenemedi." }, { status: 502 });
  }
  const name = file.name.replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 120) || `kanit.${ext}`;
  return NextResponse.json({ data: { name, path, sha256, sizeKb: Math.max(1, Math.round(file.size / 1024)), mime: file.type } });
}
