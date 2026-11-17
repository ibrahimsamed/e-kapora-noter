import { Download } from "lucide-react";
import { requireRole } from "@/lib/session";
import { readDb, sellerStats } from "@/lib/queries";
import { formatTRY } from "@/lib/format";
import { DashboardCharts } from "@/components/charts";
import { Card, CardHeader, PageHeader } from "@/components/ui";

export default async function Page() {
  const u = await requireRole("SELLER");
  const st = sellerStats(readDb(), u.id);
  const rows = st.monthlyVolume.map((m, i) => ({ ay: m.name, hacim: m.hacim, komisyon: st.monthlyCommission[i].komisyon, kazanc: st.monthlyEarnings[i].kazanc }));
  const tl = (n: number) => formatTRY(Math.round(n * 100));
  return (
    <>
      <PageHeader title="Raporlar" subtitle="Komisyon ve gelir özetiniz. İşlem bazlı PDF için işlem detayını açın."
        action={<a href="/api/export" className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold hover:bg-surface"><Download className="h-4 w-4" /> İşlemleri CSV indir</a>} />
      <div className="mb-6"><DashboardCharts d={st} /></div>
      <Card>
        <CardHeader title="Aylık gelir ve komisyon raporu" subtitle="Tamamlanan işlemler üzerinden (tamamlanma tarihine göre)" />
        <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm">
          <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-5 py-3">Ay</th><th className="px-5 py-3 text-right">İşlem hacmi</th><th className="px-5 py-3 text-right">Net kazanç</th><th className="px-5 py-3 text-right">Ödenen komisyon</th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => <tr key={r.ay}><td className="px-5 py-3">{r.ay}</td><td className="px-5 py-3 text-right">{tl(r.hacim)}</td><td className="px-5 py-3 text-right text-success">{tl(r.kazanc)}</td><td className="px-5 py-3 text-right">{tl(r.komisyon)}</td></tr>)}
          </tbody>
          <tfoot className="bg-surface font-semibold"><tr><td className="px-5 py-3">Toplam (tüm zamanlar)</td><td className="px-5 py-3 text-right">{formatTRY(st.volume)}</td><td className="px-5 py-3 text-right text-success">{formatTRY(st.bal.totalEarnings)}</td><td className="px-5 py-3 text-right">{formatTRY(st.bal.totalCommission)}</td></tr></tfoot>
        </table></div>
      </Card>
    </>
  );
}
