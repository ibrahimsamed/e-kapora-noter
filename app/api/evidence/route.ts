import { NextResponse } from "next/server";
import { currentActor } from "@/lib/session";
import { getDb, supabase } from "@/lib/data";

/** Kanıt dosyasına kısa ömürlü (60 sn) imzalı bağlantı; yalnızca işlemin tarafları ve adminler erişir. */
export async function GET(req: Request) {
  const actor = await currentActor();
  if (!actor) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401 });
  const url = new URL(req.url);
  const txId = url.searchParams.get("tx") ?? "";
  const path = url.searchParams.get("path") ?? "";
  const db = await getDb();
  const tx = db.transactions.find((t) => t.id === txId);
  const allowed =
    tx && (actor.role === "ADMIN" || (actor.role === "SELLER" ? tx.sellerId === actor.id : tx.customerId === actor.id));
  const listed = tx && db.disputes.some((d) => d.txId === tx.id && d.evidence.some((e) => e.path === path));
  if (!tx || !allowed || !listed || !path.startsWith(`${tx.id}/`)) return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
  const { data, error } = await supabase().storage.from("evidence").createSignedUrl(path, 60);
  if (error || !data) return NextResponse.json({ error: "Dosya açılamadı." }, { status: 502 });
  return NextResponse.redirect(data.signedUrl);
}
