import { RegisterForm } from "@/components/auth-forms";
import { DemoBanner } from "@/components/ui";

export const metadata = { title: "Satıcı Kaydı — e-kapora noter" };

export default function Page() {
  return (<><DemoBanner /><RegisterForm /></>);
}
