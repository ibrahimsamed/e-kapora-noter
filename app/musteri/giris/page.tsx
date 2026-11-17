import { Suspense } from "react";
import { CustomerLoginForm } from "@/components/auth-forms";
import { DemoBanner } from "@/components/ui";

export const metadata = { title: "İşlemimi Sorgula — e-kapora noter" };

export default async function Page({ searchParams }: { searchParams: Promise<{ islem?: string }> }) {
  const { islem } = await searchParams;
  return (<><DemoBanner /><Suspense><CustomerLoginForm defaultTx={islem ?? ""} /></Suspense></>);
}
