import Link from "next/link";
import { requireRole } from "@/lib/session";
import { readDb, rowsFor } from "@/lib/queries";
import { formatShortDate, formatTRY } from "@/lib/format";
import { RefundRowActions } from "@/components/forms";
import { Card, CardHeader, Empty, PageHeader, StatusBadge } from "@/components/ui";

export default async function Page() {
  const u = await requireRole("SELLER");
  const db = readDb();
  const rows = rowsFor(db, "SELLER", u.id).filter((r) => ["CANCELLATION_REQUESTED", "REFUND_PROCESSING", "REFUNDED"].includes(r.status));
  const reason = (id: string) => db.transactions.find((t) => t.id === id)?.cancelRequest?.reason ?? db.transactions.find((t) => t.id === id)?.refund?.reason ?? "—";
  return (
    <>
      <PageHeader title="İadeler" subtitle="Müşteri iptal taleplerini yanıtlayın ve iadeleri tamamlayın." />
      <Card>
        <CardHeader title="İptal ve iade işlemleri" />
        {rows.length === 0 ? <Empty text="İade veya iptal talebi bulunmuyor." /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
            <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-5 py-3">İşlem</th><th className="px-5 py-3">Müşteri</th><th className="px-5 py-3">Gerekçe</th><th className="px-5 py-3 text-right">Tutar</th><th className="px-5 py-3">Durum</th><th className="px-5 py-3">Tarih</th><th className="px-5 py-3 text-right">Aksiyon</th></tr></thead>
            <tbody className="divide-y divide-line">{rows.map((r) => (
              <tr key={r.id}>
                <td className="px-5 py-3"><Link href={`/panel/islemler/${r.id}`} className="font-mono text-xs font-semibold text-brand">{r.id}</Link></td>
                <td className="px-5 py-3">{r.customerName}</td>
                <td className="max-w-56 px-5 py-3 text-xs text-muted">{reason(r.id)}</td>
                <td className="px-5 py-3 text-right font-medium">{formatTRY(r.deposit + r.buyerFee)}</td>
                <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-5 py-3 whitespace-nowrap">{formatShortDate(r.updatedAt)}</td>
                <td className="px-5 py-3"><RefundRowActions txId={r.id} status={r.status} /></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
    </>
  );
}
