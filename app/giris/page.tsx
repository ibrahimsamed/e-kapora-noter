import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { DemoBanner } from "@/components/ui";
import { currentUser, homeFor } from "@/lib/session";

export const metadata = { title: "Giriş Yap — e-kapora noter" };

export default async function Page() {
  const u = await currentUser();
  if (u && u.role !== "CUSTOMER") redirect(homeFor(u.role));
  return (<><DemoBanner /><Suspense><LoginForm /></Suspense></>);
}
//as