"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Smartphone, Lock } from "lucide-react";
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
        <div className="-mt-1 text-right"><Link href="/sifremi-unuttum" className="text-sm font-semibold text-brand">Şifremi unuttum</Link></div>
        {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={busy}><Lock className="h-4 w-4" /> {busy ? "Giriş yapılıyor…" : "Giriş Yap"}</Button>
      </form>
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
    <Frame title="Satıcı hesabı oluştur" subtitle="Ücretsiz hesabınızla güvenli işlem oluşturmaya başlayın." foot={<>Zaten hesabınız var mı? <Link href="/giris" className="font-semibold text-brand">Giriş yapın</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Ad soyad"><Input value={f.name} onChange={set("name")} required /></Field>
        <Field label="İşletme / marka adı"><Input value={f.businessName} onChange={set("businessName")} required /></Field>
        <Field label="E-posta"><Input type="email" autoComplete="username" value={f.email} onChange={set("email")} required /></Field>
        <Field label="Cep telefonu" hint="Örn. 0532 123 45 67"><Input type="tel" value={f.phone} onChange={set("phone")} required /></Field>
        <Field label="Parola" hint="En az 8 karakter"><Input type="password" autoComplete="new-password" value={f.password} onChange={set("password")} minLength={8} required /></Field>
        {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={busy}>{busy ? "Oluşturuluyor…" : "Hesap Oluştur"}</Button>
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
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-4">
          <p className="rounded-xl bg-brand-soft p-3 text-sm text-navy">Doğrulama kodunuz: <b className="font-mono tracking-widest">{demoCode}</b></p>
          <Field label="Doğrulama kodu"><Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus required /></Field>
          {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={busy || code.length < 6}>{busy ? "Doğrulanıyor…" : "Doğrula ve devam et"}</Button>
          <button type="button" className={cn("w-full text-sm text-muted hover:text-ink")} onClick={() => { setStep(1); setCode(""); setErr(""); }}>← Numarayı değiştir</button>
        </form>
      )}
    </Frame>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await postJson("/api/auth", { action: "password.forgot", payload: { email } });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "İstek gönderilemedi"); return; }
    setSent(true);
  }

  return (
    <Frame title="Şifremi unuttum" subtitle="Hesabınızın e-posta adresini girin, parola sıfırlama bağlantısı gönderelim." foot={<Link href="/giris" className="font-semibold text-brand">Girişe dön</Link>}>
      {sent ? (
        <p role="status" className="rounded-xl bg-brand-soft p-4 text-sm text-navy">
          Bu e-posta ile kayıtlı bir hesap varsa, parola sıfırlama bağlantısı gönderildi. Bağlantı 1 saat geçerlidir. Gelen kutunuzu ve spam klasörünü kontrol edin.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="E-posta"><Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={busy}>{busy ? "Gönderiliyor…" : "Sıfırlama bağlantısı gönder"}</Button>
        </form>
      )}
    </Frame>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (password !== again) { setErr("Parolalar eşleşmiyor."); return; }
    setBusy(true);
    const r = await postJson("/api/auth", { action: "password.reset", payload: { token, password } });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "Parola değiştirilemedi"); return; }
    setDone(true);
    setTimeout(() => router.push("/giris"), 2000);
  }

  return (
    <Frame title="Yeni parola belirle" subtitle="En az 8 karakterli yeni bir parola girin." foot={<Link href="/giris" className="font-semibold text-brand">Girişe dön</Link>}>
      {done ? (
        <p role="status" className="rounded-xl bg-brand-soft p-4 text-sm text-navy">Parolanız değiştirildi. Giriş sayfasına yönlendiriliyorsunuz…</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Yeni parola"><Input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
          <Field label="Yeni parola (tekrar)"><Input type="password" autoComplete="new-password" minLength={8} value={again} onChange={(e) => setAgain(e.target.value)} required /></Field>
          {err && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{err}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={busy}><Lock className="h-4 w-4" /> {busy ? "Kaydediliyor…" : "Parolayı değiştir"}</Button>
        </form>
      )}
    </Frame>
  );
}
