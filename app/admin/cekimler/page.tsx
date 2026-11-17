import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/queries";
import { formatDateTime, formatIban, formatTRY } from "@/lib/format";
import { FilterTable } from "@/components/filter-table";
import { WithdrawalDecision } from "@/components/forms";
import { PageHeader, Pill } from "@/components/ui";

export default async function Page() {
  await requireRole("ADMIN");
  const db = readDb();
  const rows = [...db.withdrawals].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((w) => {
    const s = db.users.find((u) => u.id === w.sellerId);
    return {
      key: w.id, group: w.status, search: `${w.id} ${s?.businessName} ${w.iban}`,
      cells: [w.id, s?.businessName, formatTRY(w.amount), <span key="i" className="font-mono text-xs">{w.bankName}<br />{formatIban(w.iban)}</span>, formatDateTime(w.createdAt),
        <Pill key="s" tone={w.status === "PENDING" ? "amber" : w.status === "APPROVED" ? "green" : "red"}>{w.status === "PENDING" ? "Bekliyor" : w.status === "APPROVED" ? "Onaylandı (demo)" : "Reddedildi"}</Pill>,
        w.status === "PENDING" ? <WithdrawalDecision key="a" id={w.id} /> : <span key="n" className="text-xs text-muted">{w.adminNote ?? "—"}</span>],
    };
  });
  return (
    <>
      <PageHeader title="Para çekme talepleri" subtitle="Onaylanan talepler yalnızca simüle edilir; gerçek banka transferi yapılmaz." />
      <FilterTable title="Talepler" minWidth={900} rows={rows} rightAlign={[2]} placeholder="Satıcı, IBAN"
        headers={["Talep", "Satıcı", "Tutar", "Demo hesap", "Tarih", "Durum", "Aksiyon"]}
        groups={[{ value: "PENDING", label: "Bekleyen" }, { value: "APPROVED", label: "Onaylanan" }, { value: "REJECTED", label: "Reddedilen" }]} groupLabel="Tüm durumlar" />
    </>
  );
}
