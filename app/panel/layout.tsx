import { AppShell, type NavItem } from "@/components/shell";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/queries";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("SELLER");
  const db = readDb();
  const mine = db.transactions.filter((t) => t.sellerId === user.id);
  const nav: NavItem[] = [
    { href: "/panel", label: "Genel Bakış", icon: "dashboard", exact: true },
    { href: "/panel/yeni-islem", label: "Yeni İşlem Oluştur", icon: "plus" },
    { href: "/panel/islemler", label: "Tüm İşlemler", icon: "list" },
    { href: "/panel/bekleyen", label: "Bekleyen Ödemeler", icon: "clock", badge: mine.filter((t) => t.status === "WAITING_FOR_PAYMENT").length },
    { href: "/panel/bakiye", label: "Güvence Altındaki Bakiyem", icon: "wallet" },
    { href: "/panel/para-cekme", label: "Para Çekme", icon: "cash" },
    { href: "/panel/iadeler", label: "İadeler", icon: "refund", badge: mine.filter((t) => t.status === "CANCELLATION_REQUESTED" || t.status === "REFUND_PROCESSING").length },
    { href: "/panel/raporlar", label: "Raporlar", icon: "report" },
    { href: "/panel/ayarlar", label: "Profil ve Ayarlar", icon: "settings" },
  ];
  return (
    <AppShell nav={nav} title="Satıcı paneli" userName={user.businessName ?? user.name} userSub={user.email ?? ""}>
      {children}
    </AppShell>
  );
}
