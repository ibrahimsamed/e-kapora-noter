import { Suspense } from "react";
import { CustomerLoginForm } from "@/components/auth-forms";
import { DemoBanner } from "@/components/ui";

export const metadata = { title: "İşlemimi Sorgula — e-kapora noter" };

export default async function Page({ searchParams }: { searchParams: Promise<{ islem?: string; donus?: string }> }) {
  const { islem, donus } = await searchParams;
  // Paylaşılan bağlantıdan (/musteri/islem/EK-...) gelindiyse işlem ID otomatik dolsun.
  const fromLink = donus?.match(/^\/musteri\/islem\/([A-Za-z0-9-]+)/)?.[1];
  const txId = (islem || fromLink || "").toUpperCase();
  return (<><DemoBanner /><Suspense><CustomerLoginForm defaultTx={txId} /></Suspense></>);
}
