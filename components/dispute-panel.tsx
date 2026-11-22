"use client";
import { useState } from "react";
import { FileText, Gavel, Handshake, Scale } from "lucide-react";
import type { Dispute, Role } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/workflow";
import { DISPUTE_STATUS, decisionText } from "@/lib/dispute-text";
import { formatDateTime } from "@/lib/format";
import { Button, Card, CardHeader, Field, Input, Modal, Pill, Textarea } from "./ui";
import { useAction } from "./use-action";

const overdue = (iso?: string) => !!iso && new Date(iso).getTime() < Date.now();

export function EvidenceList({ dispute, txId }: { dispute: Dispute; txId: string }) {
  if (dispute.evidence.length === 0) return <p className="text-sm text-muted">Kanıt yüklenmedi.</p>;
  return (
    <ul className="divide-y divide-line">
      {dispute.evidence.map((e, i) => (
        <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-muted" />
          {e.path ? (
            <a href={`/api/evidence?tx=${encodeURIComponent(txId)}&path=${encodeURIComponent(e.path)}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate font-medium text-brand underline">{e.name}</a>
          ) : (
            <span className="min-w-0 flex-1 truncate">{e.name} <span className="text-xs text-muted">(eski kayıt: dosya yok)</span></span>
          )}
          <span className="text-xs text-muted">{e.sizeKb} KB • {ROLE_LABEL[e.by]} • {formatDateTime(e.at)}</span>
          {e.sha256 && <span className="w-full pl-7 font-mono text-[10px] text-muted">SHA-256: {e.sha256}</span>}
        </li>
      ))}
    </ul>
  );
}

export function DisputePanel({ dispute, txId, role }: { dispute: Dispute; txId: string; role: Role }) {
  const { run, busy } = useAction();
  const [pct, setPct] = useState("50");
  const [appeal, setAppeal] = useState(false);
  const [reason, setReason] = useState("");
  const isParty = role !== "ADMIN";
  const st = DISPUTE_STATUS[dispute.status];
  const offers = dispute.offers ?? [];
  const canNegotiate = isParty && dispute.status !== "RESOLVED";
  const canAppeal = isParty && dispute.status === "DECIDED" && !dispute.appeal && !overdue(dispute.appealUntil);

  return (
    <Card className="border-red-200">
      <CardHeader title="Uyuşmazlık" action={<Pill tone={st.tone}>{st.label}</Pill>} />
      <div className="space-y-4 p-5 text-sm">
        <dl className="grid gap-x-6 gap-y-1 text-xs text-muted sm:grid-cols-2">
          {dispute.respondBy && dispute.status === "OPEN" && (
            <div>Karşı taraf yanıt süresi: <b className={overdue(dispute.respondBy) ? "text-red-700" : "text-ink"}>{formatDateTime(dispute.respondBy)}</b>{overdue(dispute.respondBy) && " (geçti)"}</div>
          )}
          {dispute.decideBy && dispute.status !== "RESOLVED" && dispute.status !== "DECIDED" && (
            <div>Platform karar süresi: <b className={overdue(dispute.decideBy) ? "text-red-700" : "text-ink"}>{formatDateTime(dispute.decideBy)}</b>{overdue(dispute.decideBy) && " (geçti)"}</div>
          )}
          {dispute.appealUntil && dispute.status === "DECIDED" && <div>İtiraz son tarihi: <b className="text-ink">{formatDateTime(dispute.appealUntil)}</b></div>}
        </dl>

        {dispute.statements.map((s, i) => (
          <div key={i} className="rounded-xl bg-surface p-3"><p className="text-xs text-muted"><Scale className="mr-1 inline h-3 w-3" />{ROLE_LABEL[s.by]} • {formatDateTime(s.at)}</p><p className="mt-1">{s.text}</p></div>
        ))}

        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-muted">Kanıtlar</p>
          <EvidenceList dispute={dispute} txId={txId} />
        </div>

        {(offers.length > 0 || canNegotiate) && (
          <div className="space-y-2 rounded-xl border border-line p-3">
            <p className="flex items-center gap-1 text-xs font-semibold uppercase text-muted"><Handshake className="h-3.5 w-3.5" /> Karşılıklı teklifler</p>
            {offers.length === 0 && <p className="text-muted">Henüz teklif yok. Anlaşırsanız tutar platform kararı beklemeden dağıtılır.</p>}
            {offers.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-2">
                <span className="flex-1">{ROLE_LABEL[o.by]}: <b>{decisionText(o.refundBps)}</b> <span className="text-xs text-muted">• {formatDateTime(o.at)}</span></span>
                <Pill tone={o.status === "ACCEPTED" ? "green" : o.status === "PENDING" ? "amber" : "slate"}>{({ PENDING: "Bekliyor", ACCEPTED: "Kabul", REJECTED: "Red", WITHDRAWN: "Geçersiz" } as const)[o.status]}</Pill>
                {canNegotiate && o.status === "PENDING" && o.by !== role && (
                  <>
                    <Button size="sm" variant="success" disabled={busy} onClick={() => run("dispute.respondOffer", { disputeId: dispute.id, offerId: o.id, accept: true }, "Teklif kabul edildi; tutar dağıtıldı.")}>Kabul et</Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => run("dispute.respondOffer", { disputeId: dispute.id, offerId: o.id, accept: false }, "Teklif reddedildi.")}>Reddet</Button>
                  </>
                )}
              </div>
            ))}
            {canNegotiate && (
              <div className="flex flex-wrap items-end gap-2 pt-1">
                <label className="text-xs text-muted">Müşteriye iade oranı (%)
                  <Input className="mt-1 w-28" inputMode="numeric" value={pct} onChange={(e) => setPct(e.target.value.replace(/\D/g, "").slice(0, 3))} />
                </label>
                <Button size="sm" variant="outline" disabled={busy || pct === "" || Number(pct) > 100}
                  onClick={() => run("dispute.offer", { disputeId: dispute.id, refundBps: Number(pct) * 100 }, "Teklifiniz karşı tarafa iletildi.")}>Teklif ver</Button>
              </div>
            )}
          </div>
        )}

        {dispute.status === "DECIDED" && dispute.proposal && (
          <div className="rounded-xl bg-brand-soft p-3 text-navy">
            <p><b>Platform kararı:</b> {decisionText(dispute.proposal.refundBps)} — {dispute.proposal.note}</p>
            <p className="mt-1 text-xs">İtiraz edilmezse {formatDateTime(dispute.appealUntil)} sonrasında uygulanır. Tutar o zamana kadar havuzda bekler.</p>
            {canAppeal && <Button className="mt-2" size="sm" variant="outline" onClick={() => setAppeal(true)}><Gavel className="h-4 w-4" /> Karara itiraz et</Button>}
          </div>
        )}
        {dispute.status === "APPEAL" && dispute.appeal && <p className="rounded-xl bg-amber-50 p-3 text-amber-900"><b>İtiraz ({ROLE_LABEL[dispute.appeal.by]}):</b> {dispute.appeal.reason}</p>}
        {dispute.resolution && (
          <p className="rounded-xl bg-success-soft p-3 text-success">
            <b>Sonuç{dispute.resolution.via === "SETTLEMENT" ? " (anlaşma)" : dispute.resolution.via === "APPEAL" ? " (itiraz sonrası nihai karar)" : ""}:</b> {decisionText(dispute.resolution.refundBps ?? (dispute.resolution.decision === "REFUND_BUYER" ? 10000 : 0))} — {dispute.resolution.note}
          </p>
        )}
        {dispute.status === "RESOLVED" && <p className="text-xs text-muted">Bu karar yalnızca havuzdaki tutarın dağıtımını belirler; yasal başvuru haklarınız (Tüketici Hakem Heyeti, arabuluculuk, mahkeme) saklıdır.</p>}
      </div>

      <Modal open={appeal} onClose={() => setAppeal(false)} title="Karara itiraz">
        <div className="space-y-4">
          <p className="text-sm text-muted">İtiraz farklı bir yönetici tarafından yeniden incelenir ve bir kez yapılabilir.</p>
          <Field label="İtiraz gerekçesi (en az 10 karakter)"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} /></Field>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAppeal(false)}>Vazgeç</Button>
            <Button disabled={busy || reason.trim().length < 10} onClick={async () => { const r = await run("dispute.appeal", { disputeId: dispute.id, reason }, "İtirazınız alındı."); if (r.ok) { setAppeal(false); setReason(""); } }}>İtiraz et</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
