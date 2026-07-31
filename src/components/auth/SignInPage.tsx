// src/components/auth/SignInPage.tsx
import { SignIn, useClerk, useUser } from "@clerk/clerk-react";
import { useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";

export default function SignInPage() {
  const [params] = useSearchParams();
  const intendedTo = params.get("to");
  // Un lien d'invitation Clerk peut, dans certains cas (email deja associe
  // a un compte existant), pointer vers /sign-in plutot que /sign-up --
  // meme garde-fou que SignUpPage : une session deja active dans ce
  // navigateur ne doit jamais absorber silencieusement le ticket de
  // quelqu'un d'autre.
  const hasTicket = params.has("__clerk_ticket");
  const { isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (intendedTo) {
      sessionStorage.setItem("auth:intended_to", intendedTo);
    } else {
      sessionStorage.removeItem("auth:intended_to");
    }
  }, [intendedTo]);

  useEffect(() => {
    if (!isLoaded || !hasTicket || !isSignedIn || signingOut) return;
    setSigningOut(true);
    signOut({ redirectUrl: window.location.href });
  }, [isLoaded, hasTicket, isSignedIn, signingOut, signOut]);

  if (hasTicket && (isSignedIn || signingOut)) {
    return (
      <p className="p-6 text-center text-gray-600">
        Préparation de votre invitation...
      </p>
    );
  }

  return (
    <SignIn
      routing="path"
      path="/sign-in"
      fallbackRedirectUrl="/role-redirect"
      forceRedirectUrl="/role-redirect"
    />
  );
}