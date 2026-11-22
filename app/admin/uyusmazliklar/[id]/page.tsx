import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/session";
import { readDb, txDetail } from "@/lib/queries";
import { formatDateTime, formatPhone, formatTRY } from "@/lib/format";
import { CATEGORY_LABEL, LEDGER_LABEL, ROLE_LABEL } from "@/lib/workflow";
import { DisputeResolve } from "@/components/forms";
import { EvidenceList } from "@/components/dispute-panel";
import { DISPUTE_STATUS, decisionText } from "@/lib/dispute-text";
import { Card, CardHeader, KV, PageHeader, Pill, StatusBadge } from "@/components/ui";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireRole("ADMIN");
  const db = (await readDb());
  const d = db.disputes.find((x) => x.id === id);
  if (!d) notFound();
  const data = txDetail(db, d!.txId, "ADMIN", admin.id);
  if (!data) notFound();
  const { tx, seller, customer, ledger, payments } = data!;
  const dd = d!;
  return (
    <>
      <Link href="/admin/uyusmazliklar" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" /> Uyuşmazlıklar</Link>
      <PageHeader title={`Uyuşmazlık ${dd.id}`} subtitle={`İşlem ${tx.id} • ${tx.title}`} action={<div className="flex items-center gap-2"><StatusBadge status={tx.status} /><Pill tone={DISPUTE_STATUS[dd.status].tone}>{DISPUTE_STATUS[dd.status].label}</Pill></div>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {tx.legalHold && <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><b>Hukuki blokaj:</b> {tx.legalHold.reference} — {tx.legalHold.reason}</p>}
          <p className="text-xs text-muted">
            Süreç: yanıt süresi {dd.respondBy ? formatDateTime(dd.respondBy) : "—"} • karar süresi {dd.decideBy ? formatDateTime(dd.decideBy) : "—"}
            {dd.proposal && <> • Öneri: {decisionText(dd.proposal.refundBps)}</>}
          </p>
          {dd.status !== "RESOLVED" ? <DisputeResolve dispute={dd} held={data!.held} adminId={admin.id} legalHold={!!tx.legalHold} /> : (
            <Card className="border-success/30"><CardHeader title="Karar uygulandı" /><div className="p-5 text-sm">
              <p className="font-semibold text-success">{decisionText(dd.resolution?.refundBps ?? (dd.resolution?.decision === "REFUND_BUYER" ? 10000 : 0))}{dd.resolution?.via === "SETTLEMENT" ? " (taraflar anlaştı)" : dd.resolution?.via === "APPEAL" ? " (itiraz sonrası nihai)" : dd.resolution?.via === "AUTO" ? " (itiraz süresi doldu)" : ""}</p>
              <p className="mt-1 text-muted">{dd.resolution?.note} • {formatDateTime(dd.resolution?.at)}</p></div></Card>
          )}
          {(dd.offers ?? []).length > 0 && (
            <Card><CardHeader title="Tarafların teklifleri" /><ul className="divide-y divide-line px-5">{(dd.offers ?? []).map((o) => (
              <li key={o.id} className="flex justify-between py-2.5 text-sm"><span>{ROLE_LABEL[o.by]}: {decisionText(o.refundBps)}</span><span className="text-xs text-muted">{o.status} • {formatDateTime(o.at)}</span></li>
            ))}</ul></Card>
          )}
          <Card>
            <CardHeader title="Tarafların açıklamaları" />
            <div className="space-y-3 p-5">
              {dd.statements.map((s, i) => (
                <div key={i} className={`rounded-xl p-4 text-sm ${s.by === "CUSTOMER" ? "bg-brand-soft" : "bg-surface"}`}>
                  <p className="text-xs font-semibold text-muted">{ROLE_LABEL[s.by]} — {s.by === "CUSTOMER" ? customer.name : seller.businessName} • {formatDateTime(s.at)}</p>
                  <p className="mt-1">{s.text}</p>
                </div>
              ))}
              {dd.reviewNotes.map((n, i) => (
                <div key={i} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm"><p className="text-xs font-semibold text-amber-800">Admin inceleme notu • {formatDateTime(n.at)}</p><p className="mt-1">{n.text}</p></div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Yüklenen kanıtlar" subtitle="Dosyalar özel depoda saklanır; bağlantılar 60 saniye geçerlidir." />
            <div className="px-5 py-2"><EvidenceList dispute={dd} txId={tx.id} /></div>
          </Card>
          <Card>
            <CardHeader title="Ödeme hareketleri" />
            <ul className="divide-y divide-line px-5">
              {payments.map((p) => <li key={p.id} className="flex justify-between py-3 text-sm"><span>Ödeme denemesi {p.cardLast4 === "HAVALE" ? "(havale/EFT)" : `•••• ${p.cardLast4}`} — {p.status === "SUCCESS" ? "Başarılı" : "Başarısız"}</span><span>{formatTRY(p.amount)}</span></li>)}
              {ledger.map((l) => <li key={l.id} className="flex justify-between py-3 text-sm"><span>{LEDGER_LABEL[l.kind]} <span className="text-xs text-muted">• {formatDateTime(l.at)}</span></span><span className="font-medium">{formatTRY(l.amount)}</span></li>)}
            </ul>
          </Card>
          <Card>
            <CardHeader title="İşlem geçmişi" />
            <ol className="space-y-3 p-5">{tx.events.map((e, i) => <li key={i} className="text-sm"><p>{e.label}</p><p className="text-xs text-muted">{formatDateTime(e.at)} • {ROLE_LABEL[e.actorRole]}</p></li>)}</ol>
          </Card>
        </div>
        <div className="space-y-6">
          <Card><CardHeader title="Alıcı bilgileri" /><dl className="divide-y divide-line px-5 py-2"><KV k="Ad soyad" v={customer.name} /><KV k="Telefon" v={formatPhone(customer.phone)} /></dl></Card>
          <Card><CardHeader title="Satıcı bilgileri" /><dl className="divide-y divide-line px-5 py-2"><KV k="İşletme" v={seller.businessName} /><KV k="Yetkili" v={seller.name} /><KV k="Telefon" v={formatPhone(seller.phone)} /></dl></Card>
          <Card><CardHeader title="İşlem detayları" action={<Link href={`/admin/islemler/${tx.id}`} className="text-xs font-semibold text-brand">Aç →</Link>} /><dl className="divide-y divide-line px-5 py-2">
            <KV k="Tür" v={CATEGORY_LABEL[tx.category]} /><KV k="Toplam bedel" v={formatTRY(tx.totalAmount)} /><KV k="Kapora" v={formatTRY(tx.deposit)} /><KV k="Alıcı komisyonu" v={formatTRY(tx.buyerFee)} /><KV k="Satıcı komisyonu" v={formatTRY(tx.sellerFee)} />
          </dl></Card>
          <Card><CardHeader title="Anlaşma koşulları" /><div className="space-y-3 p-5 text-sm"><p><b>İptal:</b> {tx.cancelPolicy}</p><p><b>İade:</b> {tx.refundPolicy}</p><p><b>Teslimat:</b> {tx.deliveryTerms}</p></div></Card>
        </div>
      </div>
    </>
  );
}
