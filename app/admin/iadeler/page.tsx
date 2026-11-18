import Link from "next/link";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/queries";
import { formatShortDate, formatTRY } from "@/lib/format";
import { FilterTable } from "@/components/filter-table";
import { RefundRowActions } from "@/components/forms";
import { PageHeader, StatusBadge } from "@/components/ui";

export default async function Page() {
  await requireRole("ADMIN");
  const db = (await readDb());
  const name = (id: string) => db.users.find((u) => u.id === id);
  const rows = db.transactions.filter((t) => ["CANCELLATION_REQUESTED", "REFUND_PROCESSING", "REFUNDED"].includes(t.status))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((t) => ({
      key: t.id, group: t.status, search: `${t.id} ${name(t.customerId)?.name} ${name(t.sellerId)?.businessName}`,
      cells: [<Link key="i" href={`/admin/islemler/${t.id}`} className="font-mono text-xs font-semibold text-brand">{t.id}</Link>,
        name(t.customerId)?.name, name(t.sellerId)?.businessName, <span key="r" className="text-xs text-muted">{t.cancelRequest?.reason ?? t.refund?.reason ?? "—"}</span>,
        formatTRY(t.refund?.amount ?? t.deposit + t.buyerFee), <StatusBadge key="s" status={t.status} />, formatShortDate(t.updatedAt), <RefundRowActions key="a" txId={t.id} status={t.status} />],
    }));
  return (
    <>
      <PageHeader title="İadeler" subtitle="İptal talepleri ve iade süreçleri." />
      <FilterTable title="İade kayıtları" minWidth={960} rows={rows} rightAlign={[4, 7]} placeholder="İşlem, müşteri, satıcı"
        headers={["İşlem", "Müşteri", "Satıcı", "Gerekçe", "Tutar", "Durum", "Tarih", "Aksiyon"]}
        groups={[{ value: "CANCELLATION_REQUESTED", label: "İptal talebi" }, { value: "REFUND_PROCESSING", label: "İade işleniyor" }, { value: "REFUNDED", label: "İade edildi" }]} groupLabel="Tüm durumlar" />
    </>
  );
}
