import { requireRole } from "@/lib/session";
import { publicUser } from "@/lib/queries";
import { ProfileForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";

export default async function Page() {
  const u = await requireRole("SELLER");
  return (<><PageHeader title="Profil ve ayarlar" /><div className="max-w-3xl"><ProfileForm user={publicUser(u)} /></div></>);
}
