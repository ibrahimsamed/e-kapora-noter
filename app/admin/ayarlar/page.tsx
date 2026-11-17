import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/queries";
import { SettingsForm } from "@/components/forms";
import { Card, CardHeader, PageHeader } from "@/components/ui";

export default async function Page() {
  await requireRole("ADMIN");
  const s = readDb().settings;
  return (
    <>
      <PageHeader title="Ayarlar" />
      <div className="max-w-3xl space-y-6">
        <SettingsForm buyerFeeBps={s.buyerFeeBps} sellerFeeBps={s.sellerFeeBps} minWithdrawal={s.minWithdrawal} />
        <Card>
          <CardHeader title="Demo modu" />
          <ul className="list-disc space-y-1 p-5 pl-9 text-sm text-muted">
            <li>Tüm ödemeler, iadeler ve para çekimleri simülasyondur.</li>
            <li>Demo kartları: 4242… (başarılı), 4000 0000 0000 0002 (reddedilir), 4000 0000 0000 9995 (yetersiz bakiye).</li>
            <li>Müşteri OTP kodu her zaman 123456&apos;dır.</li>
            <li>Veriler sunucudaki <code>data/db.json</code> dosyasında tutulur; silinirse demo verisi yeniden üretilir.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
