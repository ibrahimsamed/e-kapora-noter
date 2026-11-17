import { AppShell, type NavItem } from "@/components/shell";
import { requireRole } from "@/lib/session";
import { formatPhone } from "@/lib/format";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("CUSTOMER");
  const nav: NavItem[] = [
    { href: "/musteri", label: "İşlemlerim", icon: "list", exact: true },
    { href: "/musteri/ayarlar", label: "Profil ve Bildirimler", icon: "settings" },
  ];
  return (
    <AppShell nav={nav} title="Müşteri paneli" userName={user.name} userSub={formatPhone(user.phone)}>
      {children}
    </AppShell>
  );
}
