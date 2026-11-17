import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/session";
import { readDb, txDetail } from "@/lib/queries";
import { TxDetail } from "@/components/tx-detail";
import { TxActions } from "@/components/tx-actions";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireRole("ADMIN");
  const data = txDetail(readDb(), id, "ADMIN", u.id);
  if (!data) notFound();
  return (
    <>
      <Link href="/admin/islemler" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" /> İşlemler</Link>
      <div className="mb-6"><TxActions data={data!} role="ADMIN" /></div>
      <TxDetail data={data!} role="ADMIN" />
    </>
  );
}
