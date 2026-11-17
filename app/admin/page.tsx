import { Activity, AlertTriangle, Banknote, Lock, Percent, RotateCcw, ShieldCheck, Store, TrendingUp, Users } from "lucide-react";
import { requireRole } from "@/lib/session";
import { adminStats, readDb } from "@/lib/queries";
import { formatNumber, formatTRY } from "@/lib/format";
import { DashboardCharts } from "@/components/charts";
import { PageHeader, Stat } from "@/components/ui";
import { verifyLedger } from "@/lib/balances";

export const metadata = { title: "Genel Bakış — Yönetim" };

export default async function Page() {
  await requireRole("ADMIN");
  const db = readDb();
  const s = adminStats(db);
  const problems = verifyLedger(db);
  return (
    <>
      <PageHeader title="Platform genel bakış" subtitle="Tüm kullanıcı, işlem ve mock para akışlarının özeti." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Toplam Kullanıcı" value={formatNumber(s.users)} icon={<Users className="h-5 w-5" />} hint={`${s.customers} müşteri`} />
        <Stat label="Toplam Satıcı" value={formatNumber(s.sellers)} icon={<Store className="h-5 w-5" />} tone="navy" />
        <Stat label="Toplam İşlem" value={formatNumber(s.totalTx)} icon={<Activity className="h-5 w-5" />} />
        <Stat label="Toplam İşlem Hacmi" value={formatTRY(s.volume)} icon={<TrendingUp className="h-5 w-5" />} tone="navy" />
        <Stat label="Güvence Altındaki Mock Para" value={formatTRY(s.secured)} icon={<Lock className="h-5 w-5" />} tone="success" />
        <Stat label="Platform Komisyon Geliri" value={formatTRY(s.commission)} icon={<Percent className="h-5 w-5" />} tone="success" />
        <Stat label="Bekleyen İade" value={formatNumber(s.pendingRefunds)} icon={<RotateCcw className="h-5 w-5" />} tone="amber" />
        <Stat label="Bekleyen Çekim Talebi" value={formatNumber(s.pendingWithdrawals)} icon={<Banknote className="h-5 w-5" />} tone="amber" />
        <Stat label="Açık Uyuşmazlık" value={formatNumber(s.openDisputes)} icon={<AlertTriangle className="h-5 w-5" />} tone="red" />
      </div>
      <div className="mb-6"><DashboardCharts d={s} commissionTitle="Aylık platform komisyon geliri" /></div>
      <div className={`flex items-center gap-3 rounded-2xl border p-4 text-sm ${problems.length ? "border-red-300 bg-red-50 text-red-800" : "border-success/30 bg-success-soft text-success"}`}>
        <ShieldCheck className="h-5 w-5 shrink-0" />
        {problems.length ? `Defter tutarsızlığı: ${problems.join("; ")}` : "Finansal defter (ledger) tutarlılık kontrolü: tüm işlemler tutarlı."}
      </div>
    </>
  );
}
