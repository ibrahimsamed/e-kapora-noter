import { CheckCircle2, Circle, FileText, Lock } from "lucide-react";
import type { TxDetailData } from "@/lib/queries";
import type { Role } from "@/lib/types";
import { CATEGORY_LABEL, LEDGER_LABEL, ROLE_LABEL } from "@/lib/workflow";
import { formatDate, formatDateTime, formatPhone, formatTRY } from "@/lib/format";
import { Card, CardHeader, KV, Pill, StatusBadge } from "./ui";
import { DisputePanel } from "./dispute-panel";

function Summary({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold text-navy">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </Card>
  );
}

export function TxDetail({ data, role }: { data: TxDetailData; role: Role }) {
  const { tx, seller, customer, payments, ledger, dispute, held } = data;
  const showSeller = role !== "SELLER";
  const showCustomer = role !== "CUSTOMER";
  const lastEvent = tx.events.length - 1;
  const totalPay = tx.deposit + tx.buyerFee;
  const isAdmin = role === "ADMIN";
  const rate = tx.totalAmount > 0 ? `%${(Math.round((tx.deposit / tx.totalAmount) * 10000) / 100).toString().replace(".", ",")}` : "—";
  const myFee = role === "CUSTOMER" ? tx.buyerFee : tx.sellerFee;

  return (
    <div className="space-y-6">
      <div className="card-shadow rounded-2xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-sm font-semibold text-brand">{tx.id}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy">{tx.title}</h1>
            <p className="mt-1 text-sm text-muted">{CATEGORY_LABEL[tx.category]} • Oluşturulma: {formatDateTime(tx.createdAt)}</p>
          </div>
          <StatusBadge status={tx.status} className="text-sm" />
        </div>
      </div>

      {tx.legalHold && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <p><b>Hukuki blokaj:</b> Yetkili makam talebi ({tx.legalHold.reference}) nedeniyle bu işlemdeki para hareketleri durduruldu. Blokaj kalkana kadar iade, aktarım veya karar uygulaması yapılmaz.</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Summary label="Toplam bedel" value={formatTRY(tx.totalAmount)} />
        <Summary label="Kapora" value={formatTRY(tx.deposit)} sub={isAdmin ? `Müşteri toplam ${formatTRY(totalPay)} öder` : `Kapora oranı ${rate}`} />
        {isAdmin
          ? <Summary label="Komisyon" value={formatTRY(tx.buyerFee + tx.sellerFee)} sub={`Alıcı ${formatTRY(tx.buyerFee)} • Satıcı ${formatTRY(tx.sellerFee)}`} />
          : <Summary label="Sistem ücreti" value={formatTRY(myFee)} />}
        <Summary label="Güvence altındaki tutar" value={formatTRY(held)} sub={held ? "Güvenli havuzda" : "Havuzda tutar yok"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="İşlem zaman çizelgesi" />
            <ol className="p-5">
              {tx.events.map((e, i) => (
                <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
                  {i !== lastEvent && <span className="absolute left-[9px] top-5 h-full w-px bg-line" />}
                  {i === lastEvent ? <CheckCircle2 className="relative h-5 w-5 shrink-0 text-brand" /> : <CheckCircle2 className="relative h-5 w-5 shrink-0 text-success" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{e.label}</p>
                    <p className="text-xs text-muted">{formatDateTime(e.at)} • {ROLE_LABEL[e.actorRole]}</p>
                  </div>
                </li>
              ))}
              {(tx.status === "WAITING_FOR_PAYMENT" || tx.status === "SECURED" || tx.status === "WAITING_FOR_CONFIRMATION") && (
                <li className="flex gap-3 pt-5 text-muted">
                  <Circle className="h-5 w-5 shrink-0" />
                  <p className="text-sm">{tx.status === "WAITING_FOR_PAYMENT" ? "Sıradaki: müşteri ödemesi" : "Sıradaki: taraf onayları ve işlem sonucu"}</p>
                </li>
              )}
            </ol>
          </Card>

          <Card>
            <CardHeader title="İşlem koşulları" />
            <div className="space-y-4 p-5 text-sm">
              {[["Açıklama", tx.description], ["İptal koşulları", tx.cancelPolicy], ["İade koşulları", tx.refundPolicy], ["Teslimat / hizmet koşulları", tx.deliveryTerms], ...(tx.extraNotes ? [["Ek açıklama", tx.extraNotes]] : [])].map(([k, v]) => (
                <div key={k}><p className="text-xs font-semibold uppercase tracking-wide text-muted">{k}</p><p className="mt-1 text-ink">{v}</p></div>
              ))}
              <div className="grid grid-cols-2 gap-4 border-t border-line pt-4">
                <div><p className="text-xs text-muted">Hizmet / teslimat tarihi</p><p className="font-medium">{formatDate(tx.serviceDate)}</p></div>
                <div><p className="text-xs text-muted">İşlem geçerlilik süresi</p><p className="font-medium">{formatDate(tx.validUntil)}</p></div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Ödeme hareketleri" subtitle="Tüm tutarlar sunucudaki finansal defterden (ledger) gelir." />
            {payments.length === 0 && ledger.length === 0 ? (
              <p className="p-5 text-sm text-muted">Henüz ödeme hareketi yok.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th className="px-5 py-2.5">Tarih</th><th className="px-5 py-2.5">Hareket</th><th className="px-5 py-2.5 text-right">Tutar</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {payments.filter((p) => p.status === "FAILED").map((p) => (
                      <tr key={p.id}><td className="px-5 py-2.5 whitespace-nowrap">{formatDateTime(p.at)}</td><td className="px-5 py-2.5">Başarısız ödeme denemesi <span className="text-red-600">({p.failReason})</span></td><td className="px-5 py-2.5 text-right text-muted line-through">{formatTRY(p.amount)}</td></tr>
                    ))}
                    {ledger.filter((l) => isAdmin || l.kind !== "COMMISSION").map((l) => (
                      <tr key={l.id}><td className="px-5 py-2.5 whitespace-nowrap">{formatDateTime(l.at)}</td><td className="px-5 py-2.5"><p>{LEDGER_LABEL[l.kind]}</p><p className="text-xs text-muted">{l.note}</p></td><td className="px-5 py-2.5 text-right font-medium tabular-nums">{formatTRY(l.amount)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {showSeller && (
            <Card><CardHeader title="Satıcı bilgileri" /><dl className="divide-y divide-line px-5 py-2">
              <KV k="İşletme" v={seller.businessName ?? seller.name} /><KV k="Yetkili" v={seller.name} /><KV k="Telefon" v={formatPhone(seller.phone)} />{seller.city && <KV k="Şehir" v={seller.city} />}
            </dl></Card>
          )}
          {showCustomer && (
            <Card><CardHeader title="Alıcı bilgileri" /><dl className="divide-y divide-line px-5 py-2">
              <KV k="Ad soyad" v={customer.name} /><KV k="Telefon" v={formatPhone(customer.phone)} />{customer.email && <KV k="E-posta" v={customer.email} />}
            </dl></Card>
          )}
          <Card>
            <CardHeader title="Tutar özeti" />
            <dl className="divide-y divide-line px-5 py-2">
              <KV k="Toplam bedel" v={formatTRY(tx.totalAmount)} />
              <KV k="Kapora oranı" v={rate} />
              <KV k="Kapora" v={formatTRY(tx.deposit)} />
              {isAdmin ? (<>
                <KV k={`Alıcı komisyonu (%${tx.buyerFeeBps / 100})`} v={formatTRY(tx.buyerFee)} />
                <KV k="Toplam ödenecek" v={<b>{formatTRY(totalPay)}</b>} />
                <KV k={`Satıcı komisyonu (%${tx.sellerFeeBps / 100})`} v={formatTRY(tx.sellerFee)} />
                <KV k="Satıcıya net aktarım" v={formatTRY(tx.deposit - tx.sellerFee)} />
              </>) : (
                <KV k="Sistem ücreti" v={formatTRY(myFee)} />
              )}
              {tx.refund && <KV k="İade edilen" v={<span className="text-purple-700">{formatTRY(tx.refund.amount)}</span>} />}
            </dl>
          </Card>
          <Card>
            <CardHeader title="Onay kayıtları" />
            <dl className="divide-y divide-line px-5 py-2">
              <KV k="Müşteri onayı" v={tx.buyerConfirmedAt ? <Pill tone="green">{formatDateTime(tx.buyerConfirmedAt)}</Pill> : <Pill tone="amber">Bekleniyor</Pill>} />
              <KV k="Satıcı onayı" v={tx.sellerConfirmedAt ? <Pill tone="green">{formatDateTime(tx.sellerConfirmedAt)}</Pill> : <Pill tone="amber">Bekleniyor</Pill>} />
            </dl>
          </Card>
          {tx.termsSnapshot && (
            <Card>
              <CardHeader title="Kabul edilen şartlar" subtitle="Ödeme anında değiştirilemez şekilde kaydedildi." />
              <dl className="divide-y divide-line px-5 py-2">
                <KV k="Sürüm" v={tx.termsSnapshot.version} />
                <KV k="Kayıt zamanı" v={formatDateTime(tx.termsSnapshot.at)} />
                <KV k="SHA-256" v={<span className="break-all font-mono text-[10px]">{tx.termsSnapshot.hash}</span>} />
              </dl>
            </Card>
          )}
          <Card>
            <CardHeader title="Belgeler" />
            <ul className="divide-y divide-line px-5 py-1">
              {tx.documents.map((d, i) => (
                <li key={i} className="flex items-center gap-3 py-2.5 text-sm"><FileText className="h-4 w-4 shrink-0 text-muted" /><span className="min-w-0 flex-1 truncate">{d.name}</span><span className="text-xs text-muted">{ROLE_LABEL[d.by]}</span></li>
              ))}
            </ul>
          </Card>
          {dispute && <DisputePanel dispute={dispute} txId={tx.id} role={role} />}
        </div>
      </div>
    </div>
  );
}
