import { currentUser } from "@/lib/session";
import { readDb, rowsFor } from "@/lib/queries";
import { CATEGORY_LABEL, STATUS_META } from "@/lib/workflow";

function esc(v: string | number) {
  let s = String(v);
  // CSV formül enjeksiyonuna karşı önlem
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}
const tl = (k: number) => (k / 100).toFixed(2).replace(".", ",");

export async function GET() {
  const u = await currentUser();
  if (!u) return new Response("Oturum gerekli", { status: 401 });
  const rows = rowsFor(readDb(), u.role, u.id);
  const head = ["İşlem ID", "Başlık", "Tür", "Satıcı", "Müşteri", "Toplam Bedel (TL)", "Kapora (TL)", "Alıcı Komisyonu (TL)", "Satıcı Komisyonu (TL)", "Durum", "Oluşturulma"];
  const lines = rows.map((r) =>
    [r.id, r.title, CATEGORY_LABEL[r.category], r.sellerName, r.customerName, tl(r.totalAmount), tl(r.deposit), tl(r.buyerFee), tl(r.sellerFee), STATUS_META[r.status].label, r.createdAt.slice(0, 10)].map(esc).join(";"),
  );
  const body = "﻿" + [head.map(esc).join(";"), ...lines].join("\r\n");
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="e-kapora-islemler-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
