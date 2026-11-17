import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/queries";
import { sellerBalances } from "@/lib/balances";
import { formatShortDate, formatTRY } from "@/lib/format";
import { FilterTable } from "@/components/filter-table";
import { UserToggle } from "@/components/forms";
import { PageHeader, Pill } from "@/components/ui";

export default async function Page() {
  await requireRole("ADMIN");
  const db = readDb();
  const rows = db.users.filter((u) => u.role === "SELLER").map((u) => {
    const b = sellerBalances(db, u.id);
    const mine = db.transactions.filter((t) => t.sellerId === u.id);
    return {
      key: u.id, search: `${u.businessName} ${u.name} ${u.email} ${u.city}`, group: u.active ? "on" : "off",
      cells: [
        <div key="n"><p className="font-medium">{u.businessName}</p><p className="text-xs text-muted">{u.name} • {u.city ?? "—"}</p></div>,
        formatShortDate(u.createdAt), mine.length, formatTRY(mine.filter((t) => t.status !== "CANCELLED" && t.status !== "EXPIRED").reduce((a, t) => a + t.totalAmount, 0)),
        formatTRY(b.secured), formatTRY(b.available), formatTRY(b.totalCommission),
        <Pill key="a" tone={u.active ? "green" : "red"}>{u.active ? "Aktif" : "Pasif"}</Pill>,
        <UserToggle key="t" userId={u.id} active={u.active} />,
      ],
    };
  });
  return (
    <>
      <PageHeader title="Satıcı yönetimi" subtitle="Satıcıların hacim, bakiye ve komisyon özeti." />
      <FilterTable title="Satıcılar" minWidth={980} headers={["Satıcı", "Kayıt", "İşlem", "Hacim", "Güvence altı", "Çekilebilir", "Komisyon", "Durum", "Aksiyon"]} rows={rows}
        groups={[{ value: "on", label: "Aktif" }, { value: "off", label: "Pasif" }]} groupLabel="Tüm durumlar" placeholder="Satıcı ara" rightAlign={[3, 4, 5, 6]} />
    </>
  );
}
