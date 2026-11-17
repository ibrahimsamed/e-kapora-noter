import Link from "next/link";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/queries";
import { formatDateTime, formatTRY } from "@/lib/format";
import { LEDGER_LABEL } from "@/lib/workflow";
import { FilterTable } from "@/components/filter-table";
import { PageHeader, Pill } from "@/components/ui";

export default async function Page() {
  await requireRole("ADMIN");
  const db = readDb();
  const user = (id?: string) => db.users.find((u) => u.id === id);
  const rows = [
    ...db.ledger.filter((l) => l.txId).map((l) => ({
      key: l.id, group: l.kind, at: l.at,
      search: `${l.txId} ${LEDGER_LABEL[l.kind]} ${user(l.customerId)?.name ?? ""} ${user(l.sellerId)?.businessName ?? ""}`,
      cells: [formatDateTime(l.at), <Link key="t" href={`/admin/islemler/${l.txId}`} className="font-mono text-xs font-semibold text-brand">{l.txId}</Link>,
        <div key="k"><p>{LEDGER_LABEL[l.kind]}</p><p className="text-xs text-muted">{l.note}</p></div>, user(l.customerId)?.name ?? "—", user(l.sellerId)?.businessName ?? "—", formatTRY(l.amount)],
    })),
    ...db.payments.filter((p) => p.status === "FAILED").map((p) => ({
      key: p.id, group: "FAILED", at: p.at,
      search: `${p.txId} başarısız ${p.failReason}`,
      cells: [formatDateTime(p.at), <Link key="t" href={`/admin/islemler/${p.txId}`} className="font-mono text-xs font-semibold text-brand">{p.txId}</Link>,
        <div key="k"><Pill tone="red">Başarısız ödeme</Pill><p className="mt-1 text-xs text-muted">{p.failReason}</p></div>, "—", "—", formatTRY(p.amount)],
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <>
      <PageHeader title="Ödemeler ve para hareketleri" subtitle="Finansal defterdeki (ledger) tüm demo hareketler." />
      <FilterTable title="Hareketler" minWidth={900} rows={rows} rightAlign={[5]} placeholder="İşlem ID, kişi, hareket"
        headers={["Tarih", "İşlem", "Hareket", "Müşteri", "Satıcı", "Tutar"]}
        groups={[...Object.entries(LEDGER_LABEL).filter(([k]) => !k.startsWith("WITHDRAWAL")).map(([value, label]) => ({ value, label })), { value: "FAILED", label: "Başarısız ödeme" }]} groupLabel="Tüm hareketler" />
    </>
  );
}
