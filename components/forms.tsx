"use client";
import { useState } from "react";
import { Banknote, Check, Gavel, Save, X } from "lucide-react";
import type { PublicUser } from "@/lib/queries";
import { formatTRY, tlToKurus, formatIban } from "@/lib/format";
import { Button, Card, CardHeader, Field, Input, Modal, Select, Textarea } from "./ui";
import { useAction } from "./use-action";

export function ProfileForm({ user }: { user: PublicUser }) {
  const { run, busy } = useAction();
  const [f, setF] = useState({
    name: user.name, email: user.email ?? "", businessName: user.businessName ?? "", city: user.city ?? "",
    bankName: user.bankName ?? "", iban: user.iban ?? "", notif: user.notif,
  });
  const seller = user.role === "SELLER";
  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); run("profile.update", f, "Profil güncellendi."); }}>
      <Card>
        <CardHeader title="Profil bilgileri" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Ad soyad"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
          <Field label="E-posta"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Telefon" hint="Telefon numarası değiştirilemez (doğrulama için kullanılır)."><Input value={user.phone} disabled /></Field>
          {seller && <Field label="İşletme adı"><Input value={f.businessName} onChange={(e) => setF({ ...f, businessName: e.target.value })} /></Field>}
          {seller && <Field label="Şehir"><Input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>}
        </div>
      </Card>
      {seller && (
        <Card>
          <CardHeader title="Banka bilgisi" subtitle="Para çekimi için kullanılacak banka bilgileri." />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Banka"><Input value={f.bankName} onChange={(e) => setF({ ...f, bankName: e.target.value })} /></Field>
            <Field label="IBAN" hint="TR + 24 rakam"><Input value={f.iban} onChange={(e) => setF({ ...f, iban: e.target.value })} placeholder="TR000000000000000000000001" /></Field>
          </div>
        </Card>
      )}
      <Card>
        <CardHeader title="Bildirim ayarları" subtitle="Bildirim tercihleriniz." />
        <div className="space-y-3 p-5">
          {([["sms", "SMS bildirimleri"], ["email", "E-posta bildirimleri"], ["whatsapp", "WhatsApp bildirimleri"]] as const).map(([k, l]) => (
            <label key={k} className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm">
              <span>{l}</span>
              <input type="checkbox" className="h-5 w-5" checked={f.notif[k]} onChange={(e) => setF({ ...f, notif: { ...f.notif, [k]: e.target.checked } })} />
            </label>
          ))}
        </div>
      </Card>
      <Button type="submit" disabled={busy}><Save className="h-4 w-4" /> Kaydet</Button>
    </form>
  );
}

export function WithdrawForm({ available, min, defaultBank, defaultIban }: { available: number; min: number; defaultBank: string; defaultIban: string }) {
  const { run, busy } = useAction();
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState(defaultBank || "Banka A.Ş.");
  const [iban, setIban] = useState(defaultIban);
  const [err, setErr] = useState("");
  const kurus = tlToKurus(amount);
  return (
    <Card>
      <CardHeader title="Para çekme talebi oluştur" />
      <form className="space-y-4 p-5" onSubmit={async (e) => {
        e.preventDefault(); setErr("");
        const r = await run("withdrawal.request", { amount: kurus, bankName: bank, iban }, "Talep oluşturuldu; admin onayı bekleniyor.");
        if (r.ok) setAmount(""); else setErr(r.error ?? "");
      }}>
        <div className="flex items-center justify-between rounded-xl bg-success-soft p-4">
          <span className="text-sm text-success">Çekilebilir bakiye</span>
          <span className="text-xl font-bold text-success">{formatTRY(available)}</span>
        </div>
        <Field label="Çekim tutarı (TL)" hint={`Minimum ${formatTRY(min)}`}>
          <div className="flex gap-2">
            <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <Button type="button" variant="outline" onClick={() => setAmount(String(available / 100))}>Tümü</Button>
          </div>
        </Field>
        <Field label="Banka">
          <Select value={bank} onChange={(e) => setBank(e.target.value)}>
            {["Banka A.Ş.", "Örnek Katılım Bankası", "Test Ticaret Bankası"].map((b) => <option key={b}>{b}</option>)}
          </Select>
        </Field>
        <Field label="IBAN" hint="TR + 24 rakam"><Input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="TR000000000000000000000001" required /></Field>
        {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <Button type="submit" disabled={busy || kurus <= 0 || kurus > available}><Banknote className="h-4 w-4" /> Para çekme talebi oluştur</Button>
        {kurus > available && <p className="text-xs text-red-600">Tutar çekilebilir bakiyeyi aşıyor.</p>}
      </form>
    </Card>
  );
}

export function RefundRowActions({ txId, status }: { txId: string; status: string }) {
  const { run, busy } = useAction();
  if (status === "CANCELLATION_REQUESTED")
    return (
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="success" disabled={busy} onClick={() => run("tx.respondCancel", { txId, accept: true }, "İptal talebi onaylandı.")}><Check className="h-3.5 w-3.5" /> Onayla</Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => run("tx.respondCancel", { txId, accept: false }, "İptal talebi reddedildi.")}><X className="h-3.5 w-3.5" /> Reddet</Button>
      </div>
    );
  if (status === "REFUND_PROCESSING")
    return <div className="flex justify-end"><Button size="sm" disabled={busy} onClick={() => run("tx.processRefund", { txId }, "İade tamamlandı .")}>İadeyi tamamla</Button></div>;
  return null;
}

export function WithdrawalDecision({ id }: { id: string }) {
  const { run, busy } = useAction();
  const [open, setOpen] = useState<null | "approve" | "reject">(null);
  const [note, setNote] = useState("");
  return (
    <>
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="success" onClick={() => setOpen("approve")}>Onayla</Button>
        <Button size="sm" variant="outline" onClick={() => setOpen("reject")}>Reddet</Button>
      </div>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open === "approve" ? "Çekim talebini onayla" : "Çekim talebini reddet"}>
        <p className="mb-3 text-sm text-muted">{open === "approve" ? "Ödeme talebi onaylanacak." : "Tutar satıcının çekilebilir bakiyesine geri eklenecek."}</p>
        <Field label="Not (opsiyonel)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20" /></Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(null)}>Vazgeç</Button>
          <Button variant={open === "approve" ? "success" : "danger"} disabled={busy} onClick={async () => {
            const r = await run("withdrawal.decide", { id, approve: open === "approve", note }, open === "approve" ? "Talep onaylandı ." : "Talep reddedildi.");
            if (r.ok) { setOpen(null); setNote(""); }
          }}>{open === "approve" ? "Onayla" : "Reddet"}</Button>
        </div>
      </Modal>
    </>
  );
}

export function UserToggle({ userId, active }: { userId: string; active: boolean }) {
  const { run, busy } = useAction();
  return (
    <Button size="sm" variant={active ? "outline" : "success"} disabled={busy}
      onClick={() => run("user.setActive", { userId, active: !active }, active ? "Kullanıcı pasif yapıldı." : "Kullanıcı aktif yapıldı.")}>
      {active ? "Pasif yap" : "Aktif yap"}
    </Button>
  );
}

export function DisputeResolve({ disputeId, held }: { disputeId: string; held: number }) {
  const { run, busy } = useAction();
  const [decision, setDecision] = useState<"REFUND_BUYER" | "PAY_SELLER" | "MORE_REVIEW">("MORE_REVIEW");
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const labels = { REFUND_BUYER: "Müşteriye iade", PAY_SELLER: "Satıcıya aktar", MORE_REVIEW: "Ek inceleme" };
  return (
    <Card>
      <CardHeader title="Admin kararı" subtitle={`Güvenceye alınan tutar: ${formatTRY(held)}`} />
      <div className="space-y-4 p-5">
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
            <button key={k} type="button" onClick={() => setDecision(k)}
              className={`rounded-xl border p-3 text-sm font-semibold ${decision === k ? "border-brand bg-brand-soft text-brand" : "border-line hover:bg-surface"}`}>{labels[k]}</button>
          ))}
        </div>
        <Field label="Karar notu (taraflara ve kayıtlara işlenir)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <Button disabled={busy || note.trim().length < 5} onClick={() => (decision === "MORE_REVIEW" ? submit() : setConfirm(true))}><Gavel className="h-4 w-4" /> Kararı uygula</Button>
      </div>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Kararı onaylıyor musunuz?">
        <p className="mb-4 text-sm text-muted">“{labels[decision]}” kararı uygulanacak ve para hareketi gerçekleşecek. Bu işlem geri alınamaz.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirm(false)}>Vazgeç</Button>
          <Button disabled={busy} onClick={submit}>Evet, uygula</Button>
        </div>
      </Modal>
    </Card>
  );
  async function submit() {
    const r = await run("dispute.resolve", { disputeId, decision, note }, decision === "MORE_REVIEW" ? "Ek inceleme notu kaydedildi." : "Uyuşmazlık sonuçlandırıldı.");
    if (r.ok) { setConfirm(false); setNote(""); }
  }
}

export function SettingsForm({ buyerFeeBps, sellerFeeBps, minWithdrawal }: { buyerFeeBps: number; sellerFeeBps: number; minWithdrawal: number }) {
  const { run, busy } = useAction();
  const [b, setB] = useState(String(buyerFeeBps / 100));
  const [s, setS] = useState(String(sellerFeeBps / 100));
  const [m, setM] = useState(String(minWithdrawal / 100));
  return (
    <Card>
      <CardHeader title="Komisyon ve limit ayarları" subtitle="Yeni oluşturulan işlemler için geçerlidir; mevcut işlemlerin oranları sabit kalır." />
      <form className="grid gap-4 p-5 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); run("settings.update", { buyerFeeBps: Math.round(Number(b) * 100), sellerFeeBps: Math.round(Number(s) * 100), minWithdrawal: tlToKurus(m) }, "Ayarlar kaydedildi."); }}>
        <Field label="Alıcı komisyonu (%)"><Input type="number" step="0.01" min="0" max="20" value={b} onChange={(e) => setB(e.target.value)} /></Field>
        <Field label="Satıcı komisyonu (%)"><Input type="number" step="0.01" min="0" max="20" value={s} onChange={(e) => setS(e.target.value)} /></Field>
        <Field label="Minimum çekim (TL)"><Input type="number" min="1" value={m} onChange={(e) => setM(e.target.value)} /></Field>
        <div className="sm:col-span-3"><Button type="submit" disabled={busy}><Save className="h-4 w-4" /> Kaydet</Button></div>
      </form>
    </Card>
  );
}

export { formatIban };
