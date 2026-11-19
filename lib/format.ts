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

/** "5551234567" -> "555 123 45 67" (başında 0 yok) */
export function formatPhone(p: string): string {
  const d = p.replace(/\D/g, "");
  if (d.length !== 10) return p;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}

/** Yazarken telefonu "545 345 99 34" biçimine sokar; baştaki 0 / 90 / +90 atılır. */
export function maskPhone(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("90") && d.length > 10) d = d.slice(2);
  d = d.replace(/^0+/, "").slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean).join(" ");
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

/** Yazarken tutarı "1.000.000,50" biçimine sokar (nokta binlik, virgül ondalık). */
export function maskMoney(input: string): string {
  const cleaned = input.replace(/[^\d,]/g, "");
  const i = cleaned.indexOf(",");
  const intPart = (i === -1 ? cleaned : cleaned.slice(0, i)).replace(/^0+(?=\d)/, "");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (i === -1) return grouped;
  const dec = cleaned.slice(i + 1).replace(/,/g, "").slice(0, 2);
  return `${grouped || "0"},${dec}`;
}

/** "1.000.000,50" / "1.000" (TR biçimi) veya "1000.5" -> kuruş */
export function tlToKurus(v: string | number): number {
  let n: number;
  if (typeof v === "number") n = v;
  else {
    const t = v.trim();
    // Virgül varsa ya da noktalar tam binlik grubuysa (1.000, 10.000.000) TR biçimi; aksi halde nokta ondalıktır.
    const tr = t.includes(",") || /^\d{1,3}(\.\d{3})+$/.test(t);
    n = parseFloat(tr ? t.replace(/\./g, "").replace(",", ".") : t);
  }
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}
