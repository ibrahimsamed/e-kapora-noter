import Link from "next/link";
import { CheckCircle2, Clock, CreditCard, Lock } from "lucide-react";
import { requireRole } from "@/lib/session";
import { customerStats, readDb, rowsFor } from "@/lib/queries";
import { formatNumber, formatTRY } from "@/lib/format";
import type { TxStatus } from "@/lib/types";
import { TxTable } from "@/components/tx-table";
import { PageHeader, Stat } from "@/components/ui";
import { cn } from "@/lib/cn";

export const metadata = { title: "İşlemlerim — Müşteri Paneli" };

const TABS: { key: string; label: string; statuses?: TxStatus[] }[] = [
  { key: "aktif", label: "Aktif İşlemlerim", statuses: ["WAITING_FOR_PAYMENT", "PAYMENT_PROCESSING", "SECURED", "WAITING_FOR_CONFIRMATION", "DISPUTED"] },
  { key: "tamamlanan", label: "Tamamlanan İşlemlerim", statuses: ["COMPLETED"] },
  { key: "iptal", label: "İptal Edilen İşlemlerim", statuses: ["CANCELLED", "EXPIRED"] },
  { key: "iade", label: "İade Taleplerim", statuses: ["CANCELLATION_REQUESTED", "REFUND_PROCESSING", "REFUNDED"] },
  { key: "gecmis", label: "İşlem Geçmişim" },
];

export default async function Page({ searchParams }: { searchParams: Promise<{ sekme?: string }> }) {
  const u = await requireRole("CUSTOMER");
  const { sekme } = await searchParams;
  const tab = TABS.find((t) => t.key === sekme) ?? TABS[0];
  const db = readDb();
  const st = customerStats(db, u.id);
  const rows = rowsFor(db, "CUSTOMER", u.id);
  const count = (t: (typeof TABS)[number]) => (t.statuses ? rows.filter((r) => t.statuses!.includes(r.status)).length : rows.length);
  return (
    <>
      <PageHeader title={`Merhaba, ${u.name}`} subtitle="Size gönderilen güvenli işlemler ve ödeme durumlarınız." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Toplam Ödeme" value={formatTRY(st.totalPaid)} icon={<CreditCard className="h-5 w-5" />} hint={st.totalRefunded ? `İade edilen: ${formatTRY(st.totalRefunded)}` : undefined} />
        <Stat label="Güvence Altındaki Param" value={formatTRY(st.secured)} icon={<Lock className="h-5 w-5" />} tone="success" />
        <Stat label="Tamamlanan İşlemler" value={formatNumber(st.completed)} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
        <Stat label="Bekleyen İşlemler" value={formatNumber(st.pending)} icon={<Clock className="h-5 w-5" />} tone="amber" hint="Ödeme bekleyen" />
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <Link key={t.key} href={`/musteri?sekme=${t.key}`} className={cn("whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium", t.key === tab.key ? "bg-navy text-white" : "bg-white text-ink ring-1 ring-line hover:bg-surface")}>
            {t.label} <span className="opacity-60">({count(t)})</span>
          </Link>
        ))}
      </div>
      <TxTable key={tab.key} rows={rows} base="/musteri/islem" counterpart="seller" statuses={tab.statuses} title={tab.label} />
    </>
  );
}
