import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/queries";
import { formatPhone, formatShortDate } from "@/lib/format";
import { FilterTable } from "@/components/filter-table";
import { UserToggle } from "@/components/forms";
import { PageHeader, Pill } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/workflow";

export default async function Page() {
  await requireRole("ADMIN");
  const db = readDb();
  const rows = db.users.map((u) => ({
    key: u.id,
    search: `${u.name} ${u.businessName ?? ""} ${u.email ?? ""} ${u.phone}`,
    group: u.role,
    cells: [
      <div key="n"><p className="font-medium">{u.businessName ?? u.name}</p>{u.businessName && <p className="text-xs text-muted">{u.name}</p>}</div>,
      <Pill key="r" tone={u.role === "ADMIN" ? "blue" : u.role === "SELLER" ? "slate" : "green"}>{ROLE_LABEL[u.role]}</Pill>,
      u.email ?? "—", formatPhone(u.phone), formatShortDate(u.createdAt),
      db.transactions.filter((t) => t.sellerId === u.id || t.customerId === u.id).length,
      <Pill key="a" tone={u.active ? "green" : "red"}>{u.active ? "Aktif" : "Pasif"}</Pill>,
      u.role === "ADMIN" ? <span key="x" className="text-xs text-muted">—</span> : <UserToggle key="t" userId={u.id} active={u.active} />,
    ],
  }));
  return (
    <>
      <PageHeader title="Kullanıcı yönetimi" subtitle="Tüm satıcı, müşteri ve yönetici hesapları." />
      <FilterTable title="Kullanıcılar" headers={["Kullanıcı", "Rol", "E-posta", "Telefon", "Kayıt", "İşlem", "Durum", "Aksiyon"]} rows={rows}
        groups={[{ value: "SELLER", label: "Satıcılar" }, { value: "CUSTOMER", label: "Müşteriler" }, { value: "ADMIN", label: "Yöneticiler" }]} groupLabel="Tüm roller" placeholder="Ad, e-posta, telefon" />
    </>
  );
}
