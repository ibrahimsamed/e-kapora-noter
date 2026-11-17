import Link from "next/link";
import { Lock, Wallet, RotateCcw, Percent, PiggyBank } from "lucide-react";
import { requireRole } from "@/lib/session";
import { readDb, rowsFor } from "@/lib/queries";
import { sellerBalances } from "@/lib/balances";
import { formatTRY, formatShortDate } from "@/lib/format";
import { Card, CardHeader, Empty, PageHeader, Stat, StatusBadge } from "@/components/ui";

export default async function Page() {
  const u = await requireRole("SELLER");
  const db = readDb();
  const b = sellerBalances(db, u.id);
  const held = rowsFor(db, "SELLER", u.id).filter((r) => r.held > 0);
  return (
    <>
      <PageHeader title="Güvence altındaki bakiyem" subtitle="Güvenli havuzdaki kaporalar ve bakiye özetiniz." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Güvence Altındaki Bakiye" value={formatTRY(b.secured)} icon={<Lock className="h-5 w-5" />} tone="success" hint="İşlem sonuçlanınca satıcıya aktarılır" />
        <Stat label="Çekilebilir Bakiye" value={formatTRY(b.available)} icon={<Wallet className="h-5 w-5" />} tone="success" />
        <Stat label="Bekleyen İade Tutarı" value={formatTRY(b.pendingRefund)} icon={<RotateCcw className="h-5 w-5" />} tone="amber" />
        <Stat label="Toplam Komisyon" value={formatTRY(b.totalCommission)} icon={<Percent className="h-5 w-5" />} tone="navy" />
        <Stat label="Toplam Kazanç" value={formatTRY(b.totalEarnings)} icon={<PiggyBank className="h-5 w-5" />} />
        <Stat label="Bekleyen Çekim" value={formatTRY(b.pendingWithdrawal)} icon={<Wallet className="h-5 w-5" />} tone="amber" />
      </div>
      <Card>
        <CardHeader title="Güvenli havuzdaki işlemler" />
        {held.length === 0 ? <Empty text="Şu an güvence altında işlem yok." /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm">
            <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-5 py-3">İşlem</th><th className="px-5 py-3">Müşteri</th><th className="px-5 py-3">Durum</th><th className="px-5 py-3">Tarih</th><th className="px-5 py-3 text-right">Havuzdaki tutar</th></tr></thead>
            <tbody className="divide-y divide-line">{held.map((r) => (
              <tr key={r.id}><td className="px-5 py-3"><Link href={`/panel/islemler/${r.id}`} className="font-mono text-xs font-semibold text-brand">{r.id}</Link><div className="text-xs text-muted">{r.title}</div></td><td className="px-5 py-3">{r.customerName}</td><td className="px-5 py-3"><StatusBadge status={r.status} /></td><td className="px-5 py-3">{formatShortDate(r.createdAt)}</td><td className="px-5 py-3 text-right font-semibold">{formatTRY(r.held)}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
    </>
  );
}
