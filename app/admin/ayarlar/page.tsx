import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/queries";
import { SettingsForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";

export default async function Page() {
  await requireRole("ADMIN");
  const s = readDb().settings;
  return (
    <>
      <PageHeader title="Ayarlar" />
      <div className="max-w-3xl space-y-6">
        <SettingsForm buyerFeeBps={s.buyerFeeBps} sellerFeeBps={s.sellerFeeBps} minWithdrawal={s.minWithdrawal} />
      </div>
    </>
  );
}
