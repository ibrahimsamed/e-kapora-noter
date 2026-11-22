import Link from "next/link";
import {
  ShieldCheck, FileCheck2, Lock, BadgeCheck, Scale, Wallet, FileText, Bell, Menu, ArrowRight, Car, Home, Hotel,
  PartyPopper, ShoppingBag, Wrench, CheckCircle2, Clock, UserCheck, Search, ChevronDown,
} from "lucide-react";
import { Logo } from "@/components/ui";

const steps = [
  { icon: FileCheck2, title: "Satıcı işlem oluşturur", text: "Satıcı; ürün veya hizmeti, kapora tutarını ve iptal/iade koşullarını dijital olarak kaydeder. Benzersiz bir işlem ID üretilir." },
  { icon: Search, title: "Müşteri işlem detaylarını kontrol eder", text: "Müşteri bağlantı veya işlem ID + telefon doğrulaması ile tüm koşulları ve satıcı bilgilerini görür." },
  { icon: Lock, title: "Müşteri ödeme yapar", text: "Ödeme satıcıya değil güvenli havuza aktarılır ve işlem “Güvence Altında” durumuna geçer." },
  { icon: BadgeCheck, title: "Koşullar gerçekleşince sonuçlanır", text: "İki taraf da onayladığında tutar satıcıya aktarılır. Sorun olursa iptal/iade veya uyuşmazlık süreci devreye girer." },
];

const audiences = [
  { icon: Car, t: "Araç alım-satım & kiralama", d: "Araç kaporası verirken ve kiralarken ödemeniz güvende." },
  { icon: Home, t: "Ev / villa kiralama", d: "Sahte ilan riskine karşı kaporayı güvenli havuza yatırın." },
  { icon: Hotel, t: "Otel & konaklama", d: "Rezervasyon avansı hizmet gerçekleşene kadar korunur." },
  { icon: PartyPopper, t: "Organizasyon", d: "Düğün, nişan ve etkinlik kaporaları için net koşullar." },
  { icon: ShoppingBag, t: "Ürün satışı", d: "Ön ödemeli veya stok ayırma kaporalı satışlar." },
  { icon: Wrench, t: "Hizmet alımı", d: "Tadilat, montaj ve teknik hizmetlerde iki taraf da korunur." },
];

const features = [
  { icon: ShieldCheck, t: "Güvenli havuz (escrow) mantığı", d: "Kapora, işlem sonuçlanana kadar satıcıya aktarılmaz." },
  { icon: Scale, t: "Uyuşmazlık yönetimi", d: "Karşılıklı teklif, çift onaylı platform kararı ve itiraz hakkı; otomatik sonuçlandırma yok." },
  { icon: FileText, t: "PDF işlem belgesi", d: "Koşullar, onay tarihleri ve ödeme hareketleri tek belgede." },
  { icon: Wallet, t: "Net koşullar", d: "İptal, iade ve teslimat koşulları işlem öncesinde iki tarafa da açıkça gösterilir." },
  { icon: Bell, t: "Anlık durum takibi", d: "Zaman çizelgesiyle ödemenin ve onayların her adımını izleyin." },
  { icon: UserCheck, t: "Kayıt gerektirmeyen müşteri erişimi", d: "Müşteri telefon doğrulamasıyla (SMS doğrulama kodu) işlemine ulaşır." },
];

const faqs = [
  { q: "e-kapora noter bir noter veya banka mıdır?", a: "Hayır. e-kapora noter; alıcı ve satıcı arasındaki kapora ödemeleri için dijital güvenli işlem altyapısı sunan bir platformdur. Noter veya finans kuruluşu olarak hareket etmez." },
    { q: "Kaporam ne zaman satıcıya aktarılır?", a: "Alıcı ve satıcı işlemi ayrı ayrı onayladığında. Onaylardan biri eksikse tutar güvenli havuzda kalır." },
  { q: "İptal edersem paramı geri alabilir miyim?", a: "İptal talebi satıcı tarafından onaylanırsa iade süreci başlar. Anlaşmazlık olursa uyuşmazlık bildirebilirsiniz; admin inceleyip karar verir." },
  { q: "Müşteri olarak hesap açmam gerekir mi?", a: "Hayır. Satıcının paylaştığı bağlantı veya işlem ID ile, telefon numaranıza gelen doğrulama koduyla işleminize erişirsiniz." },
];

export default function Landing() {
  return (
    <div className="bg-white">

      <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="e-kapora noter"><Logo className="text-lg" /></Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-ink lg:flex">
            <a href="#nasil" className="hover:text-brand">Nasıl Çalışır?</a>
            <a href="#guvenli" className="hover:text-brand">Güvenli Ödeme</a>
            <a href="#ozellikler" className="hover:text-brand">Özellikler</a>
            <a href="#sss" className="hover:text-brand">SSS</a>
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            <Link href="/giris" className="rounded-xl px-4 py-2 text-sm font-semibold text-navy hover:bg-surface">Giriş Yap</Link>
            <Link href="/kayit" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">Ücretsiz Hesap Oluştur</Link>
          </div>
          <details className="group relative lg:hidden">
            <summary className="flex cursor-pointer list-none items-center rounded-lg p-2 hover:bg-surface" aria-label="Menü"><Menu /></summary>
            <div className="absolute right-0 top-12 w-64 space-y-1 rounded-2xl border border-line bg-white p-3 shadow-xl">
              {[["#nasil", "Nasıl Çalışır?"], ["#guvenli", "Güvenli Ödeme"], ["#ozellikler", "Özellikler"], ["#sss", "SSS"]].map(([h, l]) => (
                <a key={h} href={h} className="block rounded-lg px-3 py-2 text-sm hover:bg-surface">{l}</a>
              ))}
              <Link href="/giris" className="block rounded-lg px-3 py-2 text-sm font-semibold hover:bg-surface">Giriş Yap</Link>
              <Link href="/kayit" className="block rounded-xl bg-brand px-3 py-2.5 text-center text-sm font-semibold text-white">Ücretsiz Hesap Oluştur</Link>
            </div>
          </details>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[560px] w-[560px] rounded-full bg-brand/30 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              <ShieldCheck className="h-3.5 w-3.5" /> Kaporan güvende, anlaşman kayıt altında.
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">Kapora gönderirken artık iki kez düşünme.</h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              Alıcı ve satıcı arasındaki ödemeleri güvence altına al. Anlaşmanı dijital ortamda oluştur, ödemenin durumunu takip et ve işlemini güvenle tamamla.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/kayit" className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 font-semibold text-white hover:bg-brand-dark">Güvenli İşlem Oluştur <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/musteri/giris" className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-6 py-3.5 font-semibold text-white hover:bg-white/10">İşlemimi Sorgula</Link>
            </div>
            <p className="mt-4 text-sm text-white/60">Önce güvence. Sonra ödeme.</p>
          </div>

          <div className="relative mx-auto w-full max-w-md">
            <div className="rounded-3xl bg-white p-6 text-ink shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted">İşlem ID</p>
                  <p className="font-mono text-sm font-bold text-navy">EK-2026-000125</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Güvence Altında</span>
              </div>
              <div className="mt-5 rounded-2xl bg-surface p-4">
                <p className="text-xs text-muted">Kapora</p>
                <p className="text-3xl font-extrabold text-navy">8.500 TL</p>
                <p className="mt-1 text-xs text-muted">Otel rezervasyonu • 3 gece</p>
              </div>
              <ul className="mt-5 space-y-3 text-sm">
                <li className="flex items-center justify-between"><span className="text-muted">Durum</span><span className="font-semibold text-success">Güvence Altında</span></li>
                <li className="flex items-center justify-between"><span className="text-muted">Alıcı Onayı</span><span className="inline-flex items-center gap-1 font-semibold text-amber-700"><Clock className="h-4 w-4" />Bekleniyor</span></li>
                <li className="flex items-center justify-between"><span className="text-muted">Satıcı</span><span className="inline-flex items-center gap-1 font-semibold text-success"><CheckCircle2 className="h-4 w-4" />Onaylandı</span></li>
              </ul>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface"><div className="h-full w-2/3 rounded-full bg-success" /></div>
              <p className="mt-3 text-center text-[11px] text-muted">Örnek kart</p>
            </div>
          </div>
        </div>
      </section>

      {/* NASIL */}
      <section id="nasil" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-navy">Nasıl çalışır?</h2>
          <p className="mt-3 text-muted">Dört adımda kaporanı güvence altına al.</p>
        </div>
        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="card-shadow relative rounded-2xl border border-line bg-white p-6">
              <span className="absolute right-5 top-5 text-4xl font-black text-slate-100">{i + 1}</span>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-brand"><s.icon className="h-6 w-6" /></div>
              <h3 className="mt-4 font-semibold text-navy">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* GUVENLI ODEME */}
      <section id="guvenli" className="scroll-mt-20 bg-surface py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-navy">Güvenli ödeme sistemi</h2>
            <p className="mt-3 text-muted">Kapora doğrudan satıcıya gitmez. İşlem sonuçlanana kadar güvenli havuzda tutulur; her hareket kayıt altına alınır.</p>
            <ul className="mt-6 space-y-4">
              {[
                ["Ödeme önce güvence altına alınır", "Ödeme başarılı olduğunda işlem “Güvence Altında” durumuna geçer; ödeme olmadan güvence olmaz."],
                ["İki taraflı onay", "Müşteri ve satıcı onayları ayrı tutulur. İkisi de onaylamadan tutar aktarılmaz."],
                ["İtirazda insan incelemesi", "Uyuşmazlık açıldığında otomatik karar verilmez; kanıtlar iki yetkili tarafından değerlendirilir ve itiraz hakkı tanınır."],
                ["Tam izlenebilirlik", "Tüm durum değişiklikleri ve para hareketleri denetim kaydına ve finansal deftere işlenir."],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /><div><p className="font-semibold text-navy">{t}</p><p className="text-sm text-muted">{d}</p></div></li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* KIMLER */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-navy">Kimler kullanabilir?</h2>
          <p className="mt-3 text-muted">Kapora ve ön ödeme alınan her alanda.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map((a) => (
            <div key={a.t} className="rounded-2xl border border-line p-6 transition hover:border-brand/40 hover:shadow-md">
              <a.icon className="h-7 w-7 text-brand" />
              <h3 className="mt-3 font-semibold text-navy">{a.t}</h3>
              <p className="mt-1 text-sm text-muted">{a.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* OZELLIKLER */}
      <section id="ozellikler" className="scroll-mt-20 bg-navy py-20 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Öne çıkan özellikler</h2>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.t} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <f.icon className="h-7 w-7 text-sky-300" />
                <h3 className="mt-3 font-semibold">{f.t}</h3>
                <p className="mt-1 text-sm text-white/70">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SSS */}
      <section id="sss" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-navy">Sıkça sorulan sorular</h2>
        <div className="mt-10 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-line bg-white p-5 open:shadow-md">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-navy">
                {f.q}<ChevronDown className="h-5 w-5 shrink-0 transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-3xl bg-gradient-to-br from-navy to-brand p-10 text-center text-white sm:p-14">
          <h2 className="text-3xl font-bold tracking-tight">Kaporanı güvence altına almaya hazır mısın?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">Hesabını dakikalar içinde oluştur, ilk güvenli işlemini hemen dene.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/kayit" className="rounded-xl bg-white px-6 py-3.5 font-semibold text-navy hover:bg-surface">Ücretsiz Hesap Oluştur</Link>
            <Link href="/musteri/giris" className="rounded-xl border border-white/40 px-6 py-3.5 font-semibold hover:bg-white/10">İşlemimi Sorgula</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-muted">Kaporan güvende, anlaşman kayıt altında.</p>
          </div>
          <div className="text-sm">
            <p className="font-semibold text-navy">Platform</p>
            <ul className="mt-3 space-y-2 text-muted">
              <li><Link href="/kayit" className="hover:text-brand">Satıcı kaydı</Link></li>
              <li><Link href="/giris" className="hover:text-brand">Satıcı / Admin girişi</Link></li>
              <li><Link href="/musteri/giris" className="hover:text-brand">İşlemimi sorgula</Link></li>
            </ul>
          </div>
          <p className="text-xs text-muted">
            e-kapora noter, noterlik kurumu, banka veya finans kuruluşu değildir; resmî noter onayı sağlamaz. Uyuşmazlık kararları yalnızca havuzdaki tutarın dağıtımını belirler; tarafların yasal başvuru hakları (Tüketici Hakem Heyeti, arabuluculuk, mahkeme) saklıdır.
          </p>
        </div>
        <div className="border-t border-line py-4 text-center text-xs text-muted">© 2026 e-kapora noter</div>
      </footer>
    </div>
  );
}
