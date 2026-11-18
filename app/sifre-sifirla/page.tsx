import { ResetPasswordForm } from "@/components/auth-forms";

export const metadata = { title: "Yeni Parola — e-kapora noter", robots: { index: false }, referrer: "no-referrer" };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={token ?? ""} />;
}
