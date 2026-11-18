import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth-forms";
import { AuthModalProvider } from "@/components/auth-modal";
import { currentUser, homeFor } from "@/lib/session";

export default async function Page() {
  const u = await currentUser();
  if (u && u.role !== "CUSTOMER") redirect(homeFor(u.role));
  return (<AuthModalProvider><Suspense><LoginForm /></Suspense></AuthModalProvider>);
}
