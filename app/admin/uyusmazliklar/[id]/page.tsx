import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { requireRole } from "@/lib/session";
import { readDb, txDetail } from "@/lib/queries";
import { formatDateTime, formatPhone, formatTRY } from "@/lib/format";
import { CATEGORY_LABEL, LEDGER_LABEL, ROLE_LABEL } from "@/lib/workflow";
import { DisputeResolve } from "@/components/forms";
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
      <PageHeader title={`Uyuşmazlık ${dd.id}`} subtitle={`İşlem ${tx.id} • ${tx.title}`} action={<div className="flex items-center gap-2"><StatusBadge status={tx.status} /><Pill tone={dd.status === "RESOLVED" ? "green" : dd.status === "UNDER_REVIEW" ? "amber" : "red"}>{dd.status === "RESOLVED" ? "Sonuçlandı" : dd.status === "UNDER_REVIEW" ? "İncelemede" : "Açık"}</Pill></div>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {dd.status !== "RESOLVED" ? <DisputeResolve disputeId={dd.id} held={data!.held} /> : (
            <Card className="border-success/30"><CardHeader title="Karar verildi" /><div className="p-5 text-sm">
              <p className="font-semibold text-success">{dd.resolution?.decision === "REFUND_BUYER" ? "Müşteriye iade edildi" : "Satıcıya aktarıldı"}</p>
              <p className="mt-1 text-muted">{dd.resolution?.note} • {formatDateTime(dd.resolution?.at)}</p></div></Card>
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
            <CardHeader title="Yüklenen kanıtlar" subtitle="Yalnızca dosya adı kaydedilir." />
            {dd.evidence.length === 0 ? <p className="p-5 text-sm text-muted">Kanıt yüklenmedi.</p> : (
              <ul className="divide-y divide-line px-5">{dd.evidence.map((e, i) => (
                <li key={i} className="flex items-center gap-3 py-3 text-sm"><FileText className="h-4 w-4 text-muted" /><span className="flex-1">{e.name}</span><span className="text-xs text-muted">{e.sizeKb} KB • {ROLE_LABEL[e.by]} • {formatDateTime(e.at)}</span></li>
              ))}</ul>
            )}
          </Card>
          <Card>
            <CardHeader title="Ödeme hareketleri" />
            <ul className="divide-y divide-line px-5">
              {payments.map((p) => <li key={p.id} className="flex justify-between py-3 text-sm"><span>Ödeme denemesi •••• {p.cardLast4} — {p.status === "SUCCESS" ? "Başarılı" : "Başarısız"}</span><span>{formatTRY(p.amount)}</span></li>)}
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
