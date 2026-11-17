// Para: her yerde tamsayı KURUŞ. Float yalnızca gösterimde bölme için kullanılır.
const TZ = "Europe/Istanbul";

export function formatTRY(kurus: number): string {
  const hasFraction = kurus % 100 !== 0;
  const n = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(kurus / 100);
  return `${n} TL`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("tr-TR").format(n);
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  });
}

export function formatShortDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TZ,
  });
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

/** "5551234567" -> "0555 123 45 67" */
export function formatPhone(p: string): string {
  const d = p.replace(/\D/g, "");
  if (d.length !== 10) return p;
  return `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}

/** Girdiyi 10 haneli ulusal numaraya çevirir; geçersizse null. */
export function normalizePhone(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("90") && d.length === 12) d = d.slice(2);
  if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  return /^5\d{9}$/.test(d) ? d : null;
}

export function formatIban(i?: string): string {
  if (!i) return "—";
  return i.replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();
}

export function tlToKurus(v: string | number): number {
  const n = typeof v === "number" ? v : parseFloat(v.replace(",", "."));
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}
