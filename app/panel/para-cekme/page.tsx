import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/queries";
import { sellerBalances } from "@/lib/balances";
import { formatDateTime, formatIban, formatTRY } from "@/lib/format";
import { WithdrawForm } from "@/components/forms";
import { Card, CardHeader, Empty, PageHeader, Pill } from "@/components/ui";

const tone = { PENDING: "amber", APPROVED: "green", REJECTED: "red" } as const;
const label = { PENDING: "Admin onayı bekliyor", APPROVED: "Onaylandı (demo)", REJECTED: "Reddedildi" } as const;

export default async function Page() {
  const u = await requireRole("SELLER");
  const db = readDb();
  const b = sellerBalances(db, u.id);
  const list = db.withdrawals.filter((w) => w.sellerId === u.id).sort((a, c) => c.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <PageHeader title="Para çekme" subtitle="Demo banka hesabına simüle edilmiş para çekme talebi oluşturun." />
      <div className="grid gap-6 lg:grid-cols-2">
        <WithdrawForm available={b.available} min={db.settings.minWithdrawal} defaultBank={u.bankName ?? ""} defaultIban={u.iban ?? ""} />
        <Card>
          <CardHeader title="Taleplerim" />
          {list.length === 0 ? <Empty text="Henüz para çekme talebiniz yok." /> : (
            <ul className="divide-y divide-line">
              {list.map((w) => (
                <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-sm">
                  <div><p className="font-semibold text-navy">{formatTRY(w.amount)}</p><p className="text-xs text-muted">{w.bankName} • {formatIban(w.iban)}</p><p className="text-xs text-muted">{formatDateTime(w.createdAt)}{w.adminNote ? ` • ${w.adminNote}` : ""}</p></div>
                  <Pill tone={tone[w.status]}>{label[w.status]}</Pill>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
