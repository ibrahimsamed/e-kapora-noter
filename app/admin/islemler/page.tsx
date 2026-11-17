import { requireRole } from "@/lib/session";
import { readDb, rowsFor } from "@/lib/queries";
import { TxTable } from "@/components/tx-table";
import { PageHeader } from "@/components/ui";

export default async function Page() {
  const u = await requireRole("ADMIN");
  return (<><PageHeader title="İşlemler" subtitle="Platformdaki tüm işlemler." /><TxTable rows={rowsFor(readDb(), "ADMIN", u.id)} base="/admin/islemler" counterpart="both" /></>);
}
