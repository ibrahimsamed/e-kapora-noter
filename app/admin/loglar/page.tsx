import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/queries";
import { formatDateTime } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/workflow";
import { FilterTable } from "@/components/filter-table";
import { PageHeader, Pill } from "@/components/ui";

export default async function Page() {
  await requireRole("ADMIN");
  const db = readDb();
  const actions = [...new Set(db.audit.map((a) => a.action))].sort();
  const rows = [...db.audit].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 600).map((a) => ({
    key: a.id, group: a.action, search: `${a.action} ${a.entityId} ${a.detail} ${db.users.find((u) => u.id === a.actorId)?.name ?? ""}`,
    cells: [formatDateTime(a.at), <Pill key="a" tone="blue">{a.action}</Pill>, `${db.users.find((u) => u.id === a.actorId)?.name ?? "Sistem"} (${ROLE_LABEL[a.actorRole]})`,
      <span key="e" className="font-mono text-xs">{a.entityId}</span>, <span key="d" className="text-xs text-muted">{a.detail}</span>],
  }));
  return (
    <>
      <PageHeader title="Sistem logları" subtitle="Tüm durum değişiklikleri ve admin işlemleri (audit log). Hassas veriler loglanmaz." />
      <FilterTable title="Audit log (son 600)" minWidth={900} rows={rows} pageSize={20} placeholder="İşlem, kişi, detay"
        headers={["Zaman", "Aksiyon", "Kullanıcı", "Kayıt", "Detay"]} groups={actions.map((a) => ({ value: a, label: a }))} groupLabel="Tüm aksiyonlar" />
    </>
  );
}
