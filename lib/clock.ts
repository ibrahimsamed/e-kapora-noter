let override: Date | null = null;

/** Seed sırasında geçmiş tarihli kayıt üretmek için. */
export function setNow(d: Date | null) {
  override = d;
}

export function now(): Date {
  return override ? new Date(override) : new Date();
}

export function nowIso(): string {
  return now().toISOString();
}
