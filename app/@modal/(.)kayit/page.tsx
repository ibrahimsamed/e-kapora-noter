import { RegisterForm } from "@/components/auth-forms";
import { AuthModalProvider } from "@/components/auth-modal";

export default function Page() {
  return (<AuthModalProvider><RegisterForm /></AuthModalProvider>);
}
