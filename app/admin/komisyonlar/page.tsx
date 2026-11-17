import Link from "next/link";
import { Percent, Receipt } from "lucide-react";
import { requireRole } from "@/lib/session";
import { adminStats, readDb } from "@/lib/queries";
import { formatDateTime, formatTRY } from "@/lib/format";
import { FilterTable } from "@/components/filter-table";
import { PageHeader, Stat } from "@/components/ui";

export default async function Page() {
  await requireRole("ADMIN");
  const db = readDb();
  const s = adminStats(db);
  const done = db.transactions.filter((t) => db.ledger.some((l) => l.txId === t.id && l.kind === "COMMISSION"));
  const buyer = done.reduce((a, t) => a + t.buyerFee, 0);
  const seller = done.reduce((a, t) => a + t.sellerFee, 0);
  const rows = done.map((t) => ({
    key: t.id, search: t.id,
    cells: [formatDateTime(t.completedAt), <Link key="i" href={`/admin/islemler/${t.id}`} className="font-mono text-xs font-semibold text-brand">{t.id}</Link>,
      formatTRY(t.deposit), formatTRY(t.buyerFee), formatTRY(t.sellerFee), <b key="t">{formatTRY(t.buyerFee + t.sellerFee)}</b>],
  })).reverse();
  return (
    <>
      <PageHeader title="Komisyonlar" subtitle="Komisyon, işlem tamamlandığında gelir olarak tanınır; iade edilen işlemlerde komisyon alınmaz." />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Toplam platform geliri" value={formatTRY(s.commission)} icon={<Percent className="h-5 w-5" />} tone="success" />
        <Stat label="Alıcı komisyonları" value={formatTRY(buyer)} icon={<Receipt className="h-5 w-5" />} />
        <Stat label="Satıcı komisyonları" value={formatTRY(seller)} icon={<Receipt className="h-5 w-5" />} tone="navy" />
      </div>
      <FilterTable title="Komisyon kayıtları" rows={rows} rightAlign={[2, 3, 4, 5]} headers={["Tarih", "İşlem", "Kapora", "Alıcı", "Satıcı", "Toplam"]} placeholder="İşlem ID" />
    </>
  );
}
