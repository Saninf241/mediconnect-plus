// src/components/auth/ClerkGuard.tsx
import { useAuth, useClerk } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function ClerkGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { redirectToSignIn } = useClerk();
  const location = useLocation();
  const [didRedirect, setDidRedirect] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn && !didRedirect) {
      setDidRedirect(true);
      redirectToSignIn({ redirectUrl: location.pathname + location.search });
    }
  }, [isLoaded, isSignedIn, didRedirect, location, redirectToSignIn]);

  if (!isLoaded) return <div style={{ padding: 24 }}>Chargement…</div>;
  if (!isSignedIn) return null;

  return <>{children}</>;
}
