import { requireRole } from "@/lib/session";
import { publicUser } from "@/lib/queries";
import { ProfileForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";

export default async function Page() {
  const u = await requireRole("CUSTOMER");
  return (<><PageHeader title="Profil ve bildirim ayarları" /><div className="max-w-3xl"><ProfileForm user={publicUser(u)} /></div></>);
}
