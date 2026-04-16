// src/components/auth/SignInPage.tsx
import { SignIn } from "@clerk/clerk-react";
import { useSearchParams } from "react-router-dom";
import { useEffect } from "react";

export default function SignInPage() {
  const [params] = useSearchParams();
  const intendedTo = params.get("to");

  useEffect(() => {
    if (intendedTo) {
      sessionStorage.setItem("auth:intended_to", intendedTo);
    } else {
      sessionStorage.removeItem("auth:intended_to");
    }
  }, [intendedTo]);

  return (
    <SignIn
      routing="path"
      path="/sign-in"
      fallbackRedirectUrl="/role-redirect"
      forceRedirectUrl="/role-redirect"
    />
  );
}