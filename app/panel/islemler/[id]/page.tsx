import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/session";
import { readDb, txDetail } from "@/lib/queries";
import { TxDetail } from "@/components/tx-detail";
import { SharePanel, TxActions } from "@/components/tx-actions";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireRole("SELLER");
  const data = txDetail(readDb(), id, "SELLER", u.id);
  if (!data) notFound();
  return (
    <>
      <Link href="/panel/islemler" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" /> Tüm işlemler</Link>
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <TxActions data={data!} role="SELLER" />
        {data!.tx.status === "WAITING_FOR_PAYMENT" && <SharePanel txId={data!.tx.id} customerName={data!.customer.name} title={data!.tx.title} />}
      </div>
      <TxDetail data={data!} role="SELLER" />
    </>
  );
}
