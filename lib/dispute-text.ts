import type { Dispute } from "./types";

export const DISPUTE_STATUS: Record<Dispute["status"], { label: string; tone: "red" | "amber" | "blue" | "green" }> = {
  OPEN: { label: "Müzakere / yanıt süresi", tone: "red" },
  UNDER_REVIEW: { label: "Platform incelemesi", tone: "amber" },
  DECIDED: { label: "Karar bildirildi (itiraz süresi)", tone: "blue" },
  APPEAL: { label: "İtiraz incelemesi", tone: "amber" },
  RESOLVED: { label: "Sonuçlandı", tone: "green" },
};

/** refundBps: kaporanın müşteriye iade edilen oranı (baz puan). */
export const decisionText = (bps: number) =>
  bps >= 10000 ? "Müşteriye tam iade" : bps <= 0 ? "Satıcıya aktarım" : `Kaporanın %${bps / 100}'i müşteriye iade, kalanı satıcıya`;
