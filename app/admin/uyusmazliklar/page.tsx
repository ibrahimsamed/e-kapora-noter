import Link from "next/link";
import { DISPUTE_STATUS } from "@/lib/dispute-text";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/queries";
import { formatDateTime, formatTRY } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/workflow";
import { FilterTable } from "@/components/filter-table";
import { PageHeader, Pill } from "@/components/ui";

export default async function Page() {
  await requireRole("ADMIN");
  const db = (await readDb());
  const rows = [...db.disputes].sort((a, b) => b.openedAt.localeCompare(a.openedAt)).map((d) => {
    const tx = db.transactions.find((t) => t.id === d.txId)!;
    return {
      key: d.id, group: d.status, search: `${d.id} ${d.txId} ${d.reason}`,
      cells: [<Link key="d" href={`/admin/uyusmazliklar/${d.id}`} className="font-mono text-xs font-semibold text-brand">{d.id}</Link>, d.txId,
        ROLE_LABEL[d.openedBy], <span key="r" className="line-clamp-2 max-w-72 text-xs text-muted">{d.reason}</span>, formatTRY(tx.deposit + tx.buyerFee), formatDateTime(d.openedAt),
        <Pill key="s" tone={DISPUTE_STATUS[d.status].tone}>{DISPUTE_STATUS[d.status].label}{d.status !== "RESOLVED" && d.decideBy && new Date(d.decideBy) < new Date() ? " • SLA aşıldı" : ""}</Pill>,
        <Link key="a" href={`/admin/uyusmazliklar/${d.id}`} className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold hover:bg-surface">İncele</Link>],
    };
  });
  return (
    <>
      <PageHeader title="Uyuşmazlıklar" subtitle="Kararlar çift onayla verilir ve itiraz süresi sonunda uygulanır." />
      <FilterTable title="Uyuşmazlık kayıtları" minWidth={900} rows={rows} rightAlign={[4]} placeholder="ID, işlem, gerekçe"
        headers={["Uyuşmazlık", "İşlem", "Açan", "Gerekçe", "Tutar", "Tarih", "Durum", ""]}
        groups={[{ value: "OPEN", label: "Müzakere" }, { value: "UNDER_REVIEW", label: "İncelemede" }, { value: "DECIDED", label: "İtiraz süresinde" }, { value: "APPEAL", label: "İtiraz" }, { value: "RESOLVED", label: "Sonuçlandı" }]} groupLabel="Tüm durumlar" />
    </>
  );
}
