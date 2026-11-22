"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { Category } from "@/lib/types";
import { CANCEL_POLICIES, CATEGORIES, CATEGORY_LABEL } from "@/lib/workflow";
import { formatPhone, formatTRY, maskMoney, maskPhone, normalizePhone, tlToKurus } from "@/lib/format";
import { Button, Card, Field, Input, KV, Select, Textarea, cn } from "./ui";
import { useAction } from "./use-action";
import { TermsLink } from "./terms";

const STEPS = ["İşlem türü", "Müşteri", "Detaylar", "Koşullar", "Komisyon ve onay"];
const today = () => new Date().toISOString().slice(0, 10);

export function NewTxWizard({ sellerFeeBps }: { buyerFeeBps: number; sellerFeeBps: number }) {
  const router = useRouter();
  const { run, busy } = useAction();
  const [step, setStep] = useState(0);
  const [err, setErr] = useState("");
  const [f, setF] = useState({
    category: "" as Category | "", customerName: "", customerPhone: "", customerEmail: "",
    title: "", description: "", total: "", deposit: "", serviceDate: "", validDays: "7",
    policy: "flex", cancelPolicy: CANCEL_POLICIES[0].text, refundPolicy: "Satıcı kaynaklı iptallerde kapora ve komisyon bedelinin tamamı müşteriye iade edilir.",
    deliveryTerms: "", extraNotes: "", accept: false,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  const total = tlToKurus(f.total);
  const deposit = tlToKurus(f.deposit);
  const sellerFee = Math.round((deposit * sellerFeeBps) / 10000);

  function validate(s: number): string {
    if (s === 0 && !f.category) return "Lütfen bir işlem türü seçin.";
    if (s === 1) {
      if (f.customerName.trim().length < 3) return "Müşteri adı soyadı gerekli.";
      if (!normalizePhone(f.customerPhone)) return "Geçerli bir cep telefonu girin (5xx xxx xx xx).";
      if (f.customerEmail && !/^\S+@\S+\.\S+$/.test(f.customerEmail)) return "E-posta geçersiz.";
    }
    if (s === 2) {
      if (f.title.trim().length < 3) return "İşlem başlığı gerekli.";
      if (f.description.trim().length < 5) return "Açıklama gerekli.";
      if (total <= 0) return "Toplam bedel girin.";
      if (deposit <= 0) return "Kapora tutarı girin.";
      if (deposit > total) return "Kapora, toplam bedelden büyük olamaz.";
      if (!f.serviceDate) return "Hizmet / teslimat tarihi seçin.";
    }
    if (s === 3) {
      if (f.cancelPolicy.trim().length < 5) return "İptal koşulu girin.";
      if (f.refundPolicy.trim().length < 5) return "İade koşulu girin.";
      if (f.deliveryTerms.trim().length < 5) return "Teslimat / hizmet koşulu girin.";
    }
    if (s === 4 && !f.accept) return "Devam etmek için şartlar ve koşulları okuyup onaylamalısınız.";
    return "";
  }

  function next() {
    const e = validate(step);
    setErr(e);
    if (!e) setStep(step + 1);
  }

  async function submit() {
    const e = validate(4);
    setErr(e);
    if (e) return;
    const r = await run<{ id: string }>("tx.create", {
      category: f.category, customerName: f.customerName, customerPhone: f.customerPhone, customerEmail: f.customerEmail,
      title: f.title, description: f.description, totalAmount: total, deposit, serviceDate: f.serviceDate,
      validDays: Number(f.validDays), cancelPolicy: f.cancelPolicy, refundPolicy: f.refundPolicy,
      deliveryTerms: f.deliveryTerms, extraNotes: f.extraNotes,
    }, "İşlem oluşturuldu. Müşteriye göndermek için ID ve bağlantıyı paylaşın.");
    if (r.ok && r.data) router.push(`/panel/islemler/${r.data.id}`);
    else setErr(r.error ?? "");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ol className="flex items-center gap-2 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
              i < step ? "bg-success text-white" : i === step ? "bg-brand text-white" : "bg-white text-muted ring-1 ring-line")}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cn("hidden whitespace-nowrap text-sm sm:inline", i === step ? "font-semibold text-navy" : "text-muted")}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px w-5 bg-line sm:w-8" />}
          </li>
        ))}
      </ol>

      <Card className="p-5 sm:p-7">
        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold text-navy">İşlem türü</h2>
            <p className="mb-4 text-sm text-muted">Kapora alacağınız işlemin türünü seçin.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {CATEGORIES.map((c) => (
                <button key={c} type="button" onClick={() => set("category", c)}
                  className={cn("rounded-xl border p-4 text-left text-sm font-semibold transition", f.category === c ? "border-brand bg-brand-soft text-brand" : "border-line hover:border-brand/40")}>
                  {CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-navy">Müşteri bilgileri</h2>
            <Field label="Müşteri adı soyadı"><Input value={f.customerName} onChange={(e) => set("customerName", e.target.value)} /></Field>
            <Field label="Telefon numarası" hint="Müşteri bu numara ile doğrulanır."><Input type="tel" inputMode="numeric" value={f.customerPhone} onChange={(e) => set("customerPhone", maskPhone(e.target.value))} placeholder="555 000 00 01" /></Field>
            <Field label="E-posta (opsiyonel)"><Input type="email" value={f.customerEmail} onChange={(e) => set("customerEmail", e.target.value)} /></Field>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-navy">İşlem detayları</h2>
            <Field label="İşlem başlığı"><Input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Örn. Villa kiralama — 15-18 Temmuz" /></Field>
            <Field label="Ürün veya hizmet açıklaması"><Textarea value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Toplam satış / kiralama bedeli (TL)"><Input inputMode="decimal" placeholder="1.000.000,00" value={f.total} onChange={(e) => set("total", maskMoney(e.target.value))} /></Field>
              <Field label="Talep edilen kapora tutarı (TL)"><Input inputMode="decimal" placeholder="10.000,00" value={f.deposit} onChange={(e) => set("deposit", maskMoney(e.target.value))} /></Field>
              <Field label="Hizmet / teslimat tarihi"><Input type="date" min={today()} value={f.serviceDate} onChange={(e) => set("serviceDate", e.target.value)} /></Field>
              <Field label="İşlem geçerlilik süresi" hint="Bu sürede ödeme yapılmazsa işlem sona erer.">
                <Select value={f.validDays} onChange={(e) => set("validDays", e.target.value)}>
                  {[1, 3, 7, 14, 30].map((d) => <option key={d} value={d}>{d} gün</option>)}
                </Select>
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-navy">Anlaşma koşulları</h2>
            <div>
              <p className="mb-2 text-sm font-medium">İptal politikası</p>
              <div className="flex flex-wrap gap-2">
                {CANCEL_POLICIES.map((p) => (
                  <button key={p.key} type="button" onClick={() => { set("policy", p.key); set("cancelPolicy", p.text); }}
                    className={cn("rounded-full border px-4 py-1.5 text-sm font-medium", f.policy === p.key ? "border-brand bg-brand-soft text-brand" : "border-line")}>{p.label}</button>
                ))}
                <button type="button" onClick={() => { set("policy", "custom"); set("cancelPolicy", ""); }}
                  className={cn("rounded-full border px-4 py-1.5 text-sm font-medium", f.policy === "custom" ? "border-brand bg-brand-soft text-brand" : "border-line")}>Özel koşul</button>
              </div>
            </div>
            <Field label="İptal koşulları"><Textarea value={f.cancelPolicy} onChange={(e) => { set("cancelPolicy", e.target.value); set("policy", "custom"); }} /></Field>
            <Field label="İade koşulları"><Textarea value={f.refundPolicy} onChange={(e) => set("refundPolicy", e.target.value)} /></Field>
            <Field label="Teslimat / hizmet koşulları"><Textarea value={f.deliveryTerms} onChange={(e) => set("deliveryTerms", e.target.value)} placeholder="Teslimat yeri, saati, kapsam…" /></Field>
            <Field label="Ek açıklama (opsiyonel)"><Textarea value={f.extraNotes} onChange={(e) => set("extraNotes", e.target.value)} /></Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-navy">Komisyon ve onay</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-surface p-4">
                <p className="text-xs font-semibold uppercase text-muted">Tutar özeti</p>
                <dl className="divide-y divide-line">
                  <KV k="Ürün / hizmet bedeli" v={formatTRY(total)} />
                  <KV k="Talep edilen kapora" v={<b>{formatTRY(deposit)}</b>} />
                  <KV k="Net tutar (sistem ücreti düşülmüş)" v={<b className="text-success">{formatTRY(deposit - sellerFee)}</b>} />
                </dl>
              </div>
              <div className="rounded-xl bg-surface p-4">
                <p className="text-xs font-semibold uppercase text-muted">İşlem özeti</p>
                <dl className="divide-y divide-line">
                  <KV k="Tür" v={f.category ? CATEGORY_LABEL[f.category] : "—"} />
                  <KV k="Müşteri" v={f.customerName} />
                  <KV k="Telefon" v={formatPhone(normalizePhone(f.customerPhone) ?? f.customerPhone)} />
                  <KV k="Başlık" v={f.title} />
                  <KV k="Toplam bedel" v={formatTRY(total)} />
                  <KV k="Tarih" v={f.serviceDate} />
                  <KV k="Geçerlilik" v={`${f.validDays} gün`} />
                </dl>
              </div>
            </div>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4 text-sm">
              <input type="checkbox" className="mt-1 h-4 w-4" checked={f.accept} onChange={(e) => set("accept", e.target.checked)} />
              <span>İşlem özetini ve anlaşma koşullarını kontrol ettim; <TermsLink onAccept={() => set("accept", true)}>şartlar ve koşulları</TermsLink> okudum, işlemin oluşturulmasını ve müşteriye gönderilmesini onaylıyorum.</span>
            </label>
          </div>
        )}

        {err && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}

        <div className="mt-6 flex justify-between">
          <Button variant="outline" disabled={step === 0 || busy} onClick={() => { setErr(""); setStep(step - 1); }}><ArrowLeft className="h-4 w-4" /> Geri</Button>
          {step < 4 ? (
            <Button onClick={next}>Devam <ArrowRight className="h-4 w-4" /></Button>
          ) : (
            <Button variant="success" onClick={submit} disabled={busy}>{busy ? "Oluşturuluyor…" : "İşlemi Oluştur"}</Button>
          )}
        </div>
      </Card>
    </div>
  );
}
