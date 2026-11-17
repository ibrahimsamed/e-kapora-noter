"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, PlusCircle, ListChecks, Clock, Wallet, Banknote, RotateCcw, FileBarChart, Settings, LogOut,
  Users, Store, ReceiptText, CreditCard, Scale, Percent, ScrollText, Menu, X, Home, History, ShieldCheck,
} from "lucide-react";
import { Logo, cn, DemoBanner } from "./ui";
import { postJson } from "./use-action";

const ICONS = {
  dashboard: LayoutDashboard, plus: PlusCircle, list: ListChecks, clock: Clock, wallet: Wallet, cash: Banknote,
  refund: RotateCcw, report: FileBarChart, settings: Settings, users: Users, store: Store, receipt: ReceiptText,
  card: CreditCard, scale: Scale, percent: Percent, log: ScrollText, home: Home, history: History, shield: ShieldCheck,
};
export type IconKey = keyof typeof ICONS;
export interface NavItem { href: string; label: string; icon: IconKey; badge?: number; exact?: boolean }

export function AppShell({
  nav, title, userName, userSub, children, dark = false,
}: { nav: NavItem[]; title: string; userName: string; userSub: string; children: React.ReactNode; dark?: boolean }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await postJson("/api/auth", { action: "logout" });
    router.push("/");
    router.refresh();
  }

  const sidebar = (
    <div className={cn("flex h-full flex-col", dark ? "bg-[#0e1f37]" : "bg-navy")}>
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/" aria-label="Ana sayfa"><Logo light /></Link>
        <button className="text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Menüyü kapat"><X /></button>
      </div>
      <p className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">{title}</p>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {nav.map((n) => {
          const Icon = ICONS[n.icon];
          const active = n.exact ? path === n.href : path === n.href || path.startsWith(n.href + "/");
          return (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
              className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white")}>
              <Icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{n.label}</span>
              {!!n.badge && <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] text-white">{n.badge}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="mb-2 px-3">
          <p className="truncate text-sm font-semibold text-white">{userName}</p>
          <p className="truncate text-xs text-white/50">{userSub}</p>
        </div>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white">
          <LogOut className="h-[18px] w-[18px]" /> Çıkış Yap
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <DemoBanner />
      <div className="flex flex-1">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">{sidebar}</aside>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-navy/50" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-72 shadow-2xl">{sidebar}</div>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur lg:hidden">
            <button onClick={() => setOpen(true)} aria-label="Menüyü aç"><Menu /></button>
            <Logo />
          </header>
          <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
