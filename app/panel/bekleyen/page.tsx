import { PageHeader } from "@/components/ui";
import { TxTable } from "@/components/tx-table";
import { requireRole } from "@/lib/session";
import { readDb, rowsFor } from "@/lib/queries";

export default async function Page() {
  const u = await requireRole("SELLER");
  return (
    <>
      <PageHeader title="Bekleyen ödemeler" subtitle="Müşterinin ödeme yapmasını bekleyen işlemler. Detaydan ID/bağlantıyı yeniden paylaşabilirsiniz." />
      <TxTable rows={rowsFor((await readDb()), "SELLER", u.id)} base="/panel/islemler" counterpart="customer" statuses={["WAITING_FOR_PAYMENT", "PAYMENT_PROCESSING"]} title="Ödeme bekleyenler" exportCsv={false} />
    </>
  );
}
