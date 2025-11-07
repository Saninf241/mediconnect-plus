// src/components/auth/SignOutPage.tsx
import { useEffect } from "react";
import { useClerk } from "@clerk/clerk-react";

export default function SignOutPage() {
  const { signOut } = useClerk();
  useEffect(() => {
    (async () => {
      try { await signOut(); } finally { window.location.replace("/"); }
    })();
  }, [signOut]);
  return <div style={{ padding: 24 }}>Déconnexion…</div>;
}
