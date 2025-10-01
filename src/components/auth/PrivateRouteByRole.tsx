// src/components/auth/PrivateRouteByRole.tsx
import { PropsWithChildren, useMemo } from "react";
import { useUser } from "@clerk/clerk-react";

type Allowed =
  | "secretary"
  | "doctor"
  | "admin"
  | "assurer"
  | "pharmacist";

const normalize = (r?: string | null) =>
  (r || "").toString().trim().toLowerCase();

export default function PrivateRouteByRole({
  allowedRole,
  children,
}: PropsWithChildren<{ allowedRole: Allowed }>) {
  const { isLoaded, isSignedIn, user } = useUser();

  const role = useMemo(
    () => normalize(user?.publicMetadata?.role as string | undefined),
    [user]
  );

  if (!isLoaded) return <div style={{ padding: 24 }}>Vérification des droits…</div>;
  if (!isSignedIn) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "#b91c1c", fontWeight: 600, marginBottom: 8 }}>
          Accès refusé
        </div>
        <div style={{ fontSize: 14, color: "#555" }}>
          Vous n’êtes pas connecté. <a href="/sign-in" className="text-blue-600 underline">Se connecter</a>
        </div>
      </div>
    );
  }

  if (role !== allowedRole) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "#b91c1c", fontWeight: 600, marginBottom: 8 }}>
          Accès refusé
        </div>
        <div style={{ marginBottom: 8 }}>
          Rôle requis : <b>{allowedRole}</b>
          {role ? <> — rôle détecté : <b>{role}</b></> : null}
        </div>
        <div style={{ fontSize: 14, color: "#555" }}>
          Ouvrez “Se connecter” et utilisez un compte autorisé pour cette section.
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

