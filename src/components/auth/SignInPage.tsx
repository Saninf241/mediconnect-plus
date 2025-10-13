import { SignIn } from "@clerk/clerk-react";
import { useSearchParams } from "react-router-dom";

export default function SignInPage() {
  const [params] = useSearchParams();
  const to = params.get("to") || "/role-redirect"; // fallback s’il manque ?to
  return (
    <SignIn
      routing="path"
      path="/sign-in"
      fallbackRedirectUrl={to}
    />
  );
}
