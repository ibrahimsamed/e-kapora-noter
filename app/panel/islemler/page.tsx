import { PageHeader } from "@/components/ui";
import { TxTable } from "@/components/tx-table";
import { requireRole } from "@/lib/session";
import { readDb, rowsFor } from "@/lib/queries";

export const metadata = { title: "Tüm İşlemler — Satıcı Paneli" };

export default async function Page() {
  const u = await requireRole("SELLER");
  return (
    <>
      <PageHeader title="Tüm işlemler" subtitle="Filtreleyin, arayın, detay görüntüleyin veya PDF/CSV alın." />
      <TxTable rows={rowsFor((await readDb()), "SELLER", u.id)} base="/panel/islemler" counterpart="customer" />
    </>
  );
}
