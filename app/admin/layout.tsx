import { AppShell, type NavItem } from "@/components/shell";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/queries";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("ADMIN");
  const db = (await readDb());
  const nav: NavItem[] = [
    { href: "/admin", label: "Genel Bakış", icon: "dashboard", exact: true },
    { href: "/admin/kullanicilar", label: "Kullanıcı Yönetimi", icon: "users" },
    { href: "/admin/saticilar", label: "Satıcı Yönetimi", icon: "store" },
    { href: "/admin/islemler", label: "İşlemler", icon: "list" },
    { href: "/admin/odemeler", label: "Ödemeler", icon: "card" },
    { href: "/admin/iadeler", label: "İadeler", icon: "refund", badge: db.transactions.filter((t) => t.status === "CANCELLATION_REQUESTED" || t.status === "REFUND_PROCESSING").length },
    { href: "/admin/uyusmazliklar", label: "Uyuşmazlıklar", icon: "scale", badge: db.disputes.filter((d) => d.status !== "RESOLVED").length },
    { href: "/admin/cekimler", label: "Para Çekme Talepleri", icon: "cash", badge: db.withdrawals.filter((w) => w.status === "PENDING").length },
    { href: "/admin/komisyonlar", label: "Komisyonlar", icon: "percent" },
    { href: "/admin/loglar", label: "Sistem Logları", icon: "log" },
    { href: "/admin/ayarlar", label: "Ayarlar", icon: "settings" },
  ];
  return (
    <AppShell nav={nav} title="Yönetim paneli" userName={user.name} userSub="Admin" dark>
      {children}
    </AppShell>
  );
}
