import { NewTxWizard } from "@/components/new-tx-wizard";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/queries";

export const metadata = { title: "Yeni İşlem — Satıcı Paneli" };

export default async function Page() {
  await requireRole("SELLER");
  const { settings } = readDb();
  return (
    <>
      <PageHeader title="Yeni işlem oluştur" subtitle="Beş adımda güvenli kapora işlemi oluşturun ve müşterinize gönderin." />
      <NewTxWizard buyerFeeBps={settings.buyerFeeBps} sellerFeeBps={settings.sellerFeeBps} />
    </>
  );
}
