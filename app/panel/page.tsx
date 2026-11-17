import Link from "next/link";
import { Activity, Clock, Lock, PiggyBank, PlusCircle, TrendingUp, Wallet } from "lucide-react";
import { requireRole } from "@/lib/session";
import { readDb, rowsFor, sellerStats } from "@/lib/queries";
import { formatNumber, formatTRY } from "@/lib/format";
import { DashboardCharts } from "@/components/charts";
import { TxTable } from "@/components/tx-table";
import { PageHeader, Stat } from "@/components/ui";

export const metadata = { title: "Genel Bakış — Satıcı Paneli" };

export default async function Page() {
  const user = await requireRole("SELLER");
  const db = readDb();
  const st = sellerStats(db, user.id);
  const rows = rowsFor(db, "SELLER", user.id);
  return (
    <>
      <PageHeader title={`Hoş geldiniz, ${user.businessName ?? user.name}`} subtitle="İşlemlerinizin ve bakiyenizin güncel özeti."
        action={<Link href="/panel/yeni-islem" className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"><PlusCircle className="h-4 w-4" /> Yeni İşlem</Link>} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Toplam İşlem" value={formatNumber(st.totalTx)} icon={<Activity className="h-5 w-5" />} />
        <Stat label="Toplam İşlem Hacmi" value={formatTRY(st.volume)} icon={<TrendingUp className="h-5 w-5" />} tone="navy" />
        <Stat label="Güvence Altındaki Tutar" value={formatTRY(st.bal.secured)} icon={<Lock className="h-5 w-5" />} tone="success" hint={st.bal.pendingRefund ? `Bekleyen iade: ${formatTRY(st.bal.pendingRefund)}` : undefined} />
        <Stat label="Çekilebilir Bakiye" value={formatTRY(st.bal.available)} icon={<Wallet className="h-5 w-5" />} tone="success" />
        <Stat label="Toplam Kazanç" value={formatTRY(st.bal.totalEarnings)} icon={<PiggyBank className="h-5 w-5" />} hint={`Ödenen komisyon: ${formatTRY(st.bal.totalCommission)}`} />
        <Stat label="Bekleyen İşlemler" value={formatNumber(st.pending)} icon={<Clock className="h-5 w-5" />} tone="amber" hint="Ödeme bekleyen" />
      </div>
      <div className="mb-6"><DashboardCharts d={st} /></div>
      <TxTable rows={rows.slice(0, 40)} base="/panel/islemler" counterpart="customer" title="Son işlemler" pageSize={8} />
    </>
  );
}
