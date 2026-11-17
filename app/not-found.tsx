import Link from "next/link";
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="font-mono text-sm text-brand">404</p>
      <h1 className="text-2xl font-bold text-navy">Sayfa veya işlem bulunamadı</h1>
      <p className="text-sm text-muted">Aradığınız kayıt mevcut değil ya da erişim yetkiniz yok.</p>
      <Link href="/" className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white">Ana sayfa</Link>
    </div>
  );
}
