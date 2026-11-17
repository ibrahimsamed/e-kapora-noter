"use client";
import clsx from "clsx";
import { useEffect } from "react";
import { X, ShieldCheck, FlaskConical } from "lucide-react";
import { STATUS_META } from "@/lib/workflow";
import type { TxStatus } from "@/lib/types";

export const cn = clsx;

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost" | "success";
  size?: "sm" | "md" | "lg";
};
export function Button({ variant = "primary", size = "md", className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2.5 text-sm",
        size === "lg" && "px-6 py-3.5 text-base",
        variant === "primary" && "bg-brand text-white hover:bg-brand-dark",
        variant === "secondary" && "bg-navy text-white hover:bg-navy-2",
        variant === "success" && "bg-success text-white hover:brightness-95",
        variant === "outline" && "border border-line bg-white text-ink hover:bg-surface",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        variant === "ghost" && "text-ink hover:bg-surface",
        className,
      )}
    />
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("card-shadow rounded-2xl border border-line bg-white", className)}>{children}</div>;
}

export function CardHeader({ title, action, subtitle }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
      <div>
        <h3 className="font-semibold text-navy">{title}</h3>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status, className }: { status: TxStatus; className?: string }) {
  const m = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", m.badge, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

export function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "green" | "red" | "amber" | "blue" }) {
  const t = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-800",
    blue: "bg-blue-50 text-blue-700",
  }[tone];
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium", t)}>{children}</span>;
}

const field = "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
export function Input(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cn(field, p.className)} />;
}
export function Select(p: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={cn(field, p.className)} />;
}
export function Textarea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cn(field, "min-h-24", p.className)} />;
}
export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-muted">{hint}</span>}
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-3 sm:items-center" onClick={onClose} role="dialog" aria-modal="true">
      <div className={cn("max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl", wide ? "max-w-2xl" : "max-w-md")} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-navy">{title}</h3>
          <button onClick={onClose} aria-label="Kapat" className="rounded-lg p-1 hover:bg-surface"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stat({ label, value, icon, hint, tone = "brand" }: { label: string; value: string; icon?: React.ReactNode; hint?: string; tone?: "brand" | "success" | "navy" | "amber" | "red" }) {
  const tones = { brand: "bg-brand-soft text-brand", success: "bg-success-soft text-success", navy: "bg-slate-100 text-navy", amber: "bg-amber-50 text-amber-600", red: "bg-red-50 text-red-600" };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold tracking-tight text-navy">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        {icon && <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tones[tone])}>{icon}</div>}
      </div>
    </Card>
  );
}

export function Empty({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center text-sm text-muted">
      <ShieldCheck className="h-8 w-8 text-slate-300" />
      <p>{text}</p>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function DemoBanner() {
  return (
    <div className="flex items-center justify-center gap-2 bg-amber-100 px-3 py-1.5 text-center text-xs font-medium text-amber-900">
      <FlaskConical className="h-3.5 w-3.5 shrink-0" />
      <span>DEMO SÜRÜMÜ — Tüm ödemeler, iadeler ve para çekimleri simülasyondur; gerçek para hareketi yoktur.</span>
    </div>
  );
}

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-bold tracking-tight", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white"><ShieldCheck className="h-5 w-5" /></span>
      <span className={light ? "text-white" : "text-navy"}>
        e-kapora <span className="font-medium opacity-80">noter</span>
      </span>
    </span>
  );
}

export function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right font-medium text-ink">{v}</dd>
    </div>
  );
}
