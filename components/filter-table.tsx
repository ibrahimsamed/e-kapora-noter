"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button, Card, Empty, Input, Select } from "./ui";

export interface FRow { key: string; search: string; group?: string; cells: React.ReactNode[] }

export function FilterTable({
  title, headers, rows, groups, groupLabel = "Tümü", placeholder = "Ara…", pageSize = 15, rightAlign = [], minWidth = 720,
}: {
  title: string; headers: string[]; rows: FRow[]; groups?: { value: string; label: string }[]; groupLabel?: string;
  placeholder?: string; pageSize?: number; rightAlign?: number[]; minWidth?: number;
}) {
  const [q, setQ] = useState("");
  const [g, setG] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const n = q.trim().toLocaleLowerCase("tr");
    return rows.filter((r) => (!g || r.group === g) && (!n || r.search.toLocaleLowerCase("tr").includes(n)));
  }, [rows, q, g]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const view = filtered.slice((page - 1) * pageSize, page * pageSize);
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <h3 className="font-semibold text-navy">{title} <span className="text-sm font-normal text-muted">({filtered.length})</span></h3>
        <div className="flex flex-wrap gap-2">
          {groups && (
            <Select className="w-auto" value={g} onChange={(e) => { setG(e.target.value); setPage(1); }} aria-label="Filtre">
              <option value="">{groupLabel}</option>
              {groups.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
            </Select>
          )}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted" />
            <Input className="w-56 pl-9" placeholder={placeholder} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Ara" />
          </div>
        </div>
      </div>
      {view.length === 0 ? <Empty text="Kayıt bulunamadı." /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth }}>
            <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
              <tr>{headers.map((h, i) => <th key={h} className={`px-4 py-3 ${rightAlign.includes(i) ? "text-right" : ""}`}>{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {view.map((r) => (
                <tr key={r.key} className="hover:bg-surface/60">
                  {r.cells.map((c, i) => <td key={i} className={`px-4 py-3 ${rightAlign.includes(i) ? "text-right" : ""}`}>{c}</td>)}
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
