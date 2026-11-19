"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Download, Eye, FileText, Search } from "lucide-react";
import type { TxRow } from "@/lib/queries";
import type { Category, TxStatus } from "@/lib/types";
import { ALL_STATUSES, CATEGORIES, CATEGORY_LABEL, STATUS_META } from "@/lib/workflow";
import { formatShortDate, formatTRY } from "@/lib/format";
import { Button, Card, Empty, Input, Select, StatusBadge } from "./ui";
import { useToast } from "./toast";

export function TxTable({
  rows, base, counterpart, statuses, title, exportCsv = true, pageSize = 15,
}: {
  rows: TxRow[]; base: string; counterpart: "customer" | "seller" | "both"; statuses?: TxStatus[]; title?: string; exportCsv?: boolean; pageSize?: number;
}) {
  const toast = useToast();
  const router = useRouter();
  const [q, setQ] = useState({ id: "", name: "", status: "", cat: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const set = (k: keyof typeof q, v: string) => { setQ((s) => ({ ...s, [k]: v })); setPage(1); };

  const filtered = useMemo(() => {
    const pool = statuses ? rows.filter((r) => statuses.includes(r.status)) : rows;
    return pool.filter((r) => {
      if (q.id && !r.id.toLowerCase().includes(q.id.trim().toLowerCase())) return false;
      const n = q.name.trim().toLocaleLowerCase("tr");
      if (n && !(r.customerName + " " + r.sellerName).toLocaleLowerCase("tr").includes(n)) return false;
      if (q.status && r.status !== q.status) return false;
      if (q.cat && r.category !== q.cat) return false;
      if (q.from && r.createdAt.slice(0, 10) < q.from) return false;
      if (q.to && r.createdAt.slice(0, 10) > q.to) return false;
      return true;
    });
  }, [rows, q, statuses]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const view = filtered.slice((page - 1) * pageSize, page * pageSize);
  const statusOptions = statuses ?? ALL_STATUSES;

  async function pdf(id: string) {
    setPdfBusy(id);
    try {
      const res = await fetch(`/api/tx/${id}`);
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      const { downloadTxPdf } = await import("@/lib/pdf");
      await downloadTxPdf(data);
    } catch {
      toast("err", "PDF oluşturulamadı.");
    }
    setPdfBusy(null);
  }

  return (
    <Card>
      <div className="space-y-3 border-b border-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-navy">{title ?? "İşlemler"} <span className="text-sm font-normal text-muted">({filtered.length})</span></h3>
          {exportCsv && (
            <a href="/api/export" className="inline-flex items-center gap-2 rounded-xl border border-line px-3 py-1.5 text-sm font-semibold hover:bg-surface">
              <Download className="h-4 w-4" /> CSV
            </a>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
            <Input className="pl-9" placeholder="İşlem ID" value={q.id} onChange={(e) => set("id", e.target.value)} aria-label="İşlem ID" />
          </div>
          <Input placeholder={counterpart === "customer" ? "Müşteri adı" : counterpart === "seller" ? "Satıcı adı" : "Müşteri / satıcı adı"} value={q.name} onChange={(e) => set("name", e.target.value)} aria-label="Ad ile ara" />
          <Select value={q.status} onChange={(e) => set("status", e.target.value)} aria-label="Durum">
            <option value="">Tüm durumlar</option>
            {statusOptions.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </Select>
          <Select value={q.cat} onChange={(e) => set("cat", e.target.value)} aria-label="İşlem türü">
            <option value="">Tüm türler</option>
            {CATEGORIES.map((c: Category) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </Select>
          <Input type="date" value={q.from} onChange={(e) => set("from", e.target.value)} aria-label="Başlangıç tarihi" />
          <Input type="date" value={q.to} onChange={(e) => set("to", e.target.value)} aria-label="Bitiş tarihi" />
        </div>
      </div>

      {view.length === 0 ? (
        <Empty text="Filtrelere uyan işlem bulunamadı." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">İşlem ID</th>
                <th className="px-4 py-3">{counterpart === "seller" ? "Satıcı" : counterpart === "both" ? "Müşteri / Satıcı" : "Müşteri"}</th>
                <th className="px-4 py-3">İşlem Türü</th>
                <th className="px-4 py-3 text-right">İşlem Tutarı</th>
                <th className="px-4 py-3 text-right">Kapora</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3">Tarih</th>
                <th className="px-4 py-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {view.map((r) => (
                <tr key={r.id} className="cursor-pointer hover:bg-surface/60" onClick={() => router.push(`${base}/${r.id}`)}>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-navy">{r.id}</td>
                  <td className="px-4 py-3">
                    {counterpart === "seller" ? r.sellerName : counterpart === "both" ? (<><div>{r.customerName}</div><div className="text-xs text-muted">{r.sellerName}</div></>) : r.customerName}
                  </td>
                  <td className="px-4 py-3"><div>{CATEGORY_LABEL[r.category]}</div><div className="max-w-52 truncate text-xs text-muted">{r.title}</div></td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatTRY(r.totalAmount)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">{formatTRY(r.deposit)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 whitespace-nowrap">{formatShortDate(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Link href={`${base}/${r.id}`} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold hover:bg-white"><Eye className="h-3.5 w-3.5" /> Detay</Link>
                      <Button size="sm" variant="outline" onClick={() => pdf(r.id)} disabled={pdfBusy === r.id} aria-label={`${r.id} PDF indir`}>
                        <FileText className="h-3.5 w-3.5" /> {pdfBusy === r.id ? "…" : "PDF"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-sm">
          <span className="text-muted">Sayfa {page} / {pages}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Önceki</Button>
            <Button size="sm" variant="outline" disabled={page === pages} onClick={() => setPage(page + 1)}>Sonraki</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
