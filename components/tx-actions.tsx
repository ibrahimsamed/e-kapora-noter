"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Check, CheckCircle2, Copy, CreditCard, FileText, MessageCircle, RotateCcw, Scale, XCircle, Send, Link2, Gavel } from "lucide-react";
import type { TxDetailData } from "@/lib/queries";
import type { Role } from "@/lib/types";
import { formatTRY } from "@/lib/format";
import { DEMO_CARD_HINTS } from "@/lib/constants";
import { Button, Card, CardHeader, Field, Input, Modal, Textarea } from "./ui";
import { useAction } from "./use-action";
import { useToast } from "./toast";
import { TermsLink } from "./terms";

type Mode = null | "pay" | "cancel" | "dispute" | "statement" | "cancelUnpaid" | "refundStart";

export function PdfButton({ id, label = "PDF indir" }: { id: string; label?: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button variant="outline" disabled={busy} onClick={async () => {
      setBusy(true);
      try {
        const res = await fetch(`/api/tx/${id}`);
        if (!res.ok) throw new Error();
        const { downloadTxPdf } = await import("@/lib/pdf");
        await downloadTxPdf((await res.json()).data);
      } catch { toast("err", "PDF oluşturulamadı."); }
      setBusy(false);
    }}>
      <FileText className="h-4 w-4" /> {busy ? "Hazırlanıyor…" : label}
    </Button>
  );
}

export function SharePanel({ txId, customerName, title }: { txId: string; customerName: string; title: string }) {
  const toast = useToast();
  const origin = useSyncExternalStore(() => () => {}, () => window.location.origin, () => "");
  const link = `${origin}/musteri/islem/${txId}`;
  const copy = async (text: string, msg: string) => {
    try { await navigator.clipboard.writeText(text); toast("ok", msg); } catch { toast("err", "Kopyalanamadı; lütfen elle kopyalayın."); }
  };
  const wa = `https://wa.me/?text=${encodeURIComponent(`Merhaba ${customerName}, "${title}" işlemi için güvenli ödeme bağlantınız (İşlem ID: ${txId}):\n${link}`)}`;
  return (
    <Card>
      <CardHeader title="Müşteriye gönder" subtitle="Müşteri bu bağlantı veya işlem ID + telefon ile erişir ." />
      <div className="space-y-3 p-5">
        <div className="flex items-center gap-2 rounded-xl bg-surface p-3">
          <span className="flex-1 font-mono text-sm font-semibold text-navy">{txId}</span>
          <Button size="sm" variant="outline" onClick={() => copy(txId, "İşlem ID kopyalandı")}><Copy className="h-4 w-4" /> ID kopyala</Button>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-surface p-3">
          <span className="min-w-0 flex-1 truncate text-sm text-muted">{link}</span>
          <Button size="sm" variant="outline" onClick={() => copy(link, "Ödeme bağlantısı kopyalandı")}><Link2 className="h-4 w-4" /> Bağlantı</Button>
        </div>
        <a href={wa} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95">
          <MessageCircle className="h-4 w-4" /> WhatsApp ile paylaş
        </a>
      </div>
    </Card>
  );
}

function ReasonModal({ open, onClose, title, label, cta, danger, onSubmit, withEvidence, busy }: {
  open: boolean; onClose: () => void; title: string; label: string; cta: string; danger?: boolean; withEvidence?: boolean; busy: boolean;
  onSubmit: (text: string, evidence: string) => void;
}) {
  const [text, setText] = useState("");
  const [ev, setEv] = useState("");
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <Field label={label}><Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={500} /></Field>
        {withEvidence && (
          <Field label="Kanıt dosyası (opsiyonel)" hint="Dosya yüklenmez; yalnızca dosya adı kayda eklenir.">
            <Input type="file" onChange={(e) => setEv(e.target.files?.[0]?.name ?? "")} />
          </Field>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Vazgeç</Button>
          <Button variant={danger ? "danger" : "primary"} disabled={busy || text.trim().length < 5} onClick={() => onSubmit(text, ev)}>{cta}</Button>
        </div>
      </div>
    </Modal>
  );
}

function PayModal({ open, onClose, data }: { open: boolean; onClose: () => void; data: TxDetailData }) {
  const { run, busy } = useAction();
  const [f, setF] = useState({ number: "", name: "", exp: "", cvc: "" });
  const [res, setRes] = useState<{ ok: boolean; message: string } | null>(null);
  const [terms, setTerms] = useState(false);
  const lock = useRef(false);
  const { tx } = data;
  const total = tx.deposit + tx.buyerFee;
  const fmtNum = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current || !terms) return;
    lock.current = true;
    const r = await run<{ ok: boolean; message: string }>("tx.pay", {
      txId: tx.id, idemKey: crypto.randomUUID(), card: f, termsAccepted: terms,
    });
    lock.current = false;
    if (r.ok && r.data) setRes(r.data);
    else if (r.error) setRes({ ok: false, message: r.error });
  }

  return (
    <Modal open={open} onClose={() => { setRes(null); onClose(); }} title="Güvenli Ödeme">
      {res?.ok ? (
        <div className="space-y-4 py-4 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <p className="font-semibold text-navy">{res.message}</p>
          <p className="text-sm text-muted">Kaporanız güvenli havuzda tutuluyor. İşlem iki taraf onayladığında tamamlanır.</p>
          <Button onClick={() => { setRes(null); onClose(); }}>Tamam</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {DEMO_CARD_HINTS.map((c) => (
              <button type="button" key={c.number} onClick={() => setF({ number: fmtNum(c.number), name: "MUSTERI", exp: "12/30", cvc: "123" })}
                className="rounded-full border border-line px-3 py-1 text-xs font-medium hover:bg-surface">{c.label}</button>
            ))}
          </div>
          <Field label="Kart numarası"><Input inputMode="numeric" autoComplete="off" placeholder="4242 4242 4242 4242" value={f.number} onChange={(e) => setF({ ...f, number: fmtNum(e.target.value) })} required /></Field>
          <Field label="Kart üzerindeki isim"><Input autoComplete="off" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Son kullanma (AA/YY)"><Input placeholder="12/30" maxLength={5} autoComplete="off" value={f.exp} onChange={(e) => setF({ ...f, exp: e.target.value.replace(/[^\d/]/g, "") })} required /></Field>
            <Field label="CVC"><Input inputMode="numeric" maxLength={3} autoComplete="off" value={f.cvc} onChange={(e) => setF({ ...f, cvc: e.target.value.replace(/\D/g, "") })} required /></Field>
          </div>
          <div className="rounded-xl bg-surface p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted">Kapora</span><span>{formatTRY(tx.deposit)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Alıcı komisyonu (%{tx.buyerFeeBps / 100})</span><span>{formatTRY(tx.buyerFee)}</span></div>
            <div className="mt-1 flex justify-between border-t border-line pt-1 font-bold text-navy"><span>Toplam</span><span>{formatTRY(total)}</span></div>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
            <span><TermsLink onAccept={() => setTerms(true)}>Şartlar ve koşulları</TermsLink> okudum, kabul ediyorum.</span>
          </label>
          {res && !res.ok && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{res.message}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={busy || !terms}><CreditCard className="h-5 w-5" /> {busy ? "İşleniyor…" : `${formatTRY(total)} Öde`}</Button>
        </form>
      )}
    </Modal>
  );
}

export function TxActions({ data, role }: { data: TxDetailData; role: Role }) {
  const { tx, dispute } = data;
  const { run, busy } = useAction();
  const [mode, setMode] = useState<Mode>(null);
  const close = () => setMode(null);
  const s = tx.status;
  const myConfirm = role === "CUSTOMER" ? tx.buyerConfirmedAt : tx.sellerConfirmedAt;
  const buttons: React.ReactNode[] = [];

  if (role === "CUSTOMER" && s === "WAITING_FOR_PAYMENT") {
    buttons.push(<Button key="pay" size="lg" onClick={() => setMode("pay")}><CreditCard className="h-5 w-5" /> Güvenli Öde</Button>);
  }
  if (s === "WAITING_FOR_PAYMENT") {
    buttons.push(<Button key="cu" variant="outline" onClick={() => setMode("cancelUnpaid")}><XCircle className="h-4 w-4" /> İşlemi iptal et</Button>);
  }
  if ((role === "CUSTOMER" || role === "SELLER") && (s === "SECURED" || s === "WAITING_FOR_CONFIRMATION")) {
    if (!myConfirm) {
      buttons.push(
        <Button key="conf" variant="success" disabled={busy} onClick={() => run("tx.confirm", { txId: tx.id }, "Onayınız kaydedildi.")}>
          <Check className="h-4 w-4" /> {role === "CUSTOMER" ? "Teslim aldım / Hizmeti onaylıyorum" : "Teslimat / hizmet tamamlandı"}
        </Button>,
      );
    }
  }
  if (role === "CUSTOMER" && (s === "SECURED" || s === "WAITING_FOR_CONFIRMATION")) {
    buttons.push(<Button key="rc" variant="outline" onClick={() => setMode("cancel")}><RotateCcw className="h-4 w-4" /> İptal / iade talebi</Button>);
  }
  if (role === "SELLER" && (s === "SECURED" || s === "WAITING_FOR_CONFIRMATION")) {
    buttons.push(<Button key="rs" variant="outline" onClick={() => setMode("refundStart")}><RotateCcw className="h-4 w-4" /> İptal et ve iade et</Button>);
  }
  if (role === "ADMIN" && (s === "SECURED" || s === "WAITING_FOR_CONFIRMATION")) {
    buttons.push(<Button key="ra" variant="outline" onClick={() => setMode("refundStart")}><RotateCcw className="h-4 w-4" /> İade başlat</Button>);
  }
  if (role !== "ADMIN" && (s === "SECURED" || s === "WAITING_FOR_CONFIRMATION" || s === "CANCELLATION_REQUESTED")) {
    buttons.push(<Button key="d" variant="outline" onClick={() => setMode("dispute")}><Scale className="h-4 w-4" /> Uyuşmazlık bildir</Button>);
  }
  if (role !== "CUSTOMER" && s === "CANCELLATION_REQUESTED") {
    buttons.push(
      <Button key="ok" variant="success" disabled={busy} onClick={() => run("tx.respondCancel", { txId: tx.id, accept: true }, "İptal talebi onaylandı; iade süreci başladı.")}><Check className="h-4 w-4" /> İptal talebini onayla</Button>,
      <Button key="no" variant="outline" disabled={busy} onClick={() => run("tx.respondCancel", { txId: tx.id, accept: false }, "İptal talebi reddedildi.")}><XCircle className="h-4 w-4" /> Reddet</Button>,
    );
  }
  if (role !== "CUSTOMER" && s === "REFUND_PROCESSING") {
    buttons.push(<Button key="pr" disabled={busy} onClick={() => run("tx.processRefund", { txId: tx.id }, "İade tamamlandı.")}><Send className="h-4 w-4" /> İadeyi tamamla ({formatTRY(data.held)})</Button>);
  }
  if (role !== "ADMIN" && s === "DISPUTED" && dispute && dispute.status !== "RESOLVED") {
    buttons.push(<Button key="st" variant="outline" onClick={() => setMode("statement")}><Gavel className="h-4 w-4" /> Açıklama / kanıt ekle</Button>);
  }
  if (role === "ADMIN" && s === "DISPUTED" && dispute) {
    buttons.push(<Link key="al" href={`/admin/uyusmazliklar/${dispute.id}`} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"><Scale className="h-4 w-4" /> Uyuşmazlığı incele</Link>);
  }

  const hint =
    s === "CANCELLATION_REQUESTED" ? (role === "CUSTOMER" ? "İptal talebiniz satıcının yanıtını bekliyor." : "Müşteri iptal/iade talebi oluşturdu. Gerekçe: " + (tx.cancelRequest?.reason ?? "—")) :
    s === "WAITING_FOR_CONFIRMATION" ? (myConfirm ? "Onayınız alındı; karşı tarafın onayı bekleniyor." : "Karşı taraf onayladı; sizin onayınız bekleniyor.") :
    s === "DISPUTED" ? "Uyuşmazlık admin incelemesinde. Otomatik sonuçlandırma yapılmaz." :
    s === "REFUND_PROCESSING" ? "İade süreci başlatıldı." : null;

  return (
    <>
      <Card>
        <CardHeader title="İşlem aksiyonları" />
        <div className="space-y-3 p-5">
          {hint && <p className="rounded-xl bg-brand-soft p-3 text-sm text-navy">{hint}</p>}
          <div className="flex flex-wrap gap-2">
            {buttons.length ? buttons : <p className="text-sm text-muted">Bu durumda yapılabilecek bir işlem yok.</p>}
            <PdfButton id={tx.id} />
          </div>
        </div>
      </Card>

      {mode === "pay" && <PayModal open onClose={close} data={data} />}
      <ReasonModal open={mode === "cancel"} onClose={close} busy={busy} title="İptal / iade talebi" label="İptal gerekçeniz" cta="Talebi gönder"
        onSubmit={async (t) => { const r = await run("tx.requestCancel", { txId: tx.id, reason: t }, "Talebiniz satıcıya iletildi."); if (r.ok) close(); }} />
      <ReasonModal open={mode === "refundStart"} onClose={close} busy={busy} danger title="İptal ve iade başlat" label="Gerekçe (müşteriye iade edilecek)" cta="İade sürecini başlat"
        onSubmit={async (t) => { const r = await run("tx.requestCancel", { txId: tx.id, reason: t }, "İade süreci başlatıldı."); if (r.ok) close(); }} />
      <ReasonModal open={mode === "dispute"} onClose={close} busy={busy} danger withEvidence title="Uyuşmazlık bildir" label="Uyuşmazlık gerekçesi (en az 10 karakter)" cta="Uyuşmazlık aç"
        onSubmit={async (t, ev) => { const r = await run("dispute.open", { txId: tx.id, reason: t, evidenceName: ev }, "Uyuşmazlık kaydı açıldı; admin incelemesi bekleniyor."); if (r.ok) close(); }} />
      {dispute && (
        <ReasonModal open={mode === "statement"} onClose={close} busy={busy} withEvidence title="Açıklama / kanıt ekle" label="Açıklamanız" cta="Ekle"
          onSubmit={async (t, ev) => { const r = await run("dispute.statement", { disputeId: dispute.id, text: t, evidenceName: ev }, "Açıklamanız eklendi."); if (r.ok) close(); }} />
      )}
      <Modal open={mode === "cancelUnpaid"} onClose={close} title="İşlemi iptal et">
        <p className="mb-4 text-sm text-muted">Ödeme alınmadığı için herhangi bir iade gerekmez. İşlem iptal edilecek.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close}>Vazgeç</Button>
          <Button variant="danger" disabled={busy} onClick={async () => { const r = await run("tx.cancelUnpaid", { txId: tx.id }, "İşlem iptal edildi."); if (r.ok) close(); }}>İptal et</Button>
        </div>
      </Modal>
    </>
  );
}
