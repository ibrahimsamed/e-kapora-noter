"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Smartphone, Lock, FlaskConical } from "lucide-react";
import { Button, Card, Field, Input, Logo, cn } from "./ui";
import { postJson } from "./use-action";

function safeNext(v: string | null, fallback: string) {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

function Frame({ title, subtitle, children, foot }: { title: string; subtitle: string; children: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-30px)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex justify-center"><Logo className="text-xl" /></Link>
        <Card className="p-6 sm:p-8">
          <h1 className="text-xl font-bold text-navy">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </Card>
        {foot && <div className="mt-4 text-center text-sm text-muted">{foot}</div>}
      </div>
    </div>
  );
}

const DEMO_ACCOUNTS = [
  { label: "Satıcı: ABC Organizasyon", email: "abc-organizasyon@ekapora.demo", password: "Demo1234!" },
  { label: "Satıcı: İstanbul Oto Galeri", email: "istanbul-oto-galeri@ekapora.demo", password: "Demo1234!" },
  { label: "Admin", email: "admin@ekapora.demo", password: "Admin1234!" },
];

export function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await postJson<{ home: string }>("/api/auth", { action: "login", payload: { email, password } });
    if (!r.ok) { setErr(r.error ?? "Giriş başarısız"); setBusy(false); return; }
    router.push(safeNext(sp.get("donus"), r.data?.home ?? "/panel"));
    router.refresh();
  }

  return (
    <Frame title="Giriş yap" subtitle="Satıcı veya yönetici hesabınızla devam edin." foot={<>Hesabınız yok mu? <Link href="/kayit" className="font-semibold text-brand">Ücretsiz hesap oluşturun</Link><br />Müşteri misiniz? <Link href="/musteri/giris" className="font-semibold text-brand">İşlemimi sorgula</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="E-posta"><Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        <Field label="Parola"><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={busy}><Lock className="h-4 w-4" /> {busy ? "Giriş yapılıyor…" : "Giriş Yap"}</Button>
      </form>
      <div className="mt-6 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-900"><FlaskConical className="h-3.5 w-3.5" /> Demo hesaplar (tıklayıp doldurun)</p>
        <div className="flex flex-wrap gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button key={a.email} type="button" onClick={() => { setEmail(a.email); setPassword(a.password); }} className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100">{a.label}</button>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", businessName: "", email: "", phone: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await postJson<{ home: string }>("/api/auth", { action: "register", payload: f });
    if (!r.ok) { setErr(r.error ?? "Kayıt başarısız"); setBusy(false); return; }
    router.push(r.data?.home ?? "/panel");
    router.refresh();
  }

  return (
    <Frame title="Satıcı hesabı oluştur" subtitle="Ücretsiz DEMO hesabınızla güvenli işlem oluşturmaya başlayın." foot={<>Zaten hesabınız var mı? <Link href="/giris" className="font-semibold text-brand">Giriş yapın</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Ad soyad"><Input value={f.name} onChange={set("name")} required /></Field>
        <Field label="İşletme / marka adı"><Input value={f.businessName} onChange={set("businessName")} required /></Field>
        <Field label="E-posta"><Input type="email" autoComplete="username" value={f.email} onChange={set("email")} required /></Field>
        <Field label="Cep telefonu" hint="Örn. 0532 123 45 67"><Input type="tel" value={f.phone} onChange={set("phone")} required /></Field>
        <Field label="Parola" hint="En az 8 karakter"><Input type="password" autoComplete="new-password" value={f.password} onChange={set("password")} minLength={8} required /></Field>
        {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>{busy ? "Oluşturuluyor…" : "Hesap Oluştur"}</Button>
        <p className="text-xs text-muted">Bu bir DEMO sürümüdür; gerçek kimlik/ödeme bilgisi girmeyin.</p>
      </form>
    </Frame>
  );
}

export function CustomerLoginForm({ defaultTx = "" }: { defaultTx?: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [step, setStep] = useState<1 | 2>(1);
  const [txId, setTxId] = useState(defaultTx);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function request(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await postJson<{ demoCode: string }>("/api/auth", { action: "otp.request", payload: { phone, txId: txId.trim() || undefined } });
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? "Hata");
    setDemoCode(r.data?.demoCode ?? ""); setStep(2);
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await postJson<{ home: string }>("/api/auth", { action: "otp.verify", payload: { phone, code } });
    if (!r.ok) { setErr(r.error ?? "Hata"); setBusy(false); return; }
    const target = txId.trim() ? `/musteri/islem/${txId.trim().toUpperCase()}` : "/musteri";
    router.push(safeNext(sp.get("donus"), target));
    router.refresh();
  }

  return (
    <Frame title="İşlemimi sorgula" subtitle="Telefon numaranızla doğrulayın; kayıt olmanız gerekmez." foot={<>Satıcı mısınız? <Link href="/giris" className="font-semibold text-brand">Satıcı girişi</Link></>}>
      {step === 1 ? (
        <form onSubmit={request} className="space-y-4">
          <Field label="İşlem ID (opsiyonel)" hint="Satıcının paylaştığı ID, ör. EK-2026-000125"><Input value={txId} onChange={(e) => setTxId(e.target.value)} placeholder="EK-2026-000125" /></Field>
          <Field label="Cep telefonu"><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0555 000 00 01" required /></Field>
          {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={busy}><Smartphone className="h-4 w-4" /> Doğrulama kodu gönder</Button>
          <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">DEMO: Demo müşteri telefonları <b>0555 000 00 01</b> … <b>0555 000 00 25</b>. Gerçek SMS gönderilmez.</p>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <p className="rounded-xl bg-brand-soft p-3 text-sm text-navy">Mock OTP: gerçek SMS gönderilmedi. Demo kodunuz: <b className="font-mono tracking-widest">{demoCode}</b></p>
          <Field label="Doğrulama kodu"><Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus required /></Field>
          {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={busy || code.length < 6}>{busy ? "Doğrulanıyor…" : "Doğrula ve devam et"}</Button>
          <button type="button" className={cn("w-full text-sm text-muted hover:text-ink")} onClick={() => { setStep(1); setCode(""); setErr(""); }}>← Numarayı değiştir</button>
        </form>
      )}
    </Frame>
  );
}
