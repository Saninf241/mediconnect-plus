// src/components/auth/RequireDeveloper.tsx
import { useUser } from "@clerk/clerk-react";

export default function RequireDeveloper({ children }: React.PropsWithChildren<{}>) {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return <div style={{ padding: 24 }}>Chargement…</div>;
  }

  if (!isSignedIn) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "#b91c1c", fontWeight: 600, marginBottom: 8 }}>
          Accès refusé
        </div>
        <div style={{ fontSize: 14, color: "#555" }}>
          Vous n’êtes pas connecté.{" "}
          <a href="/sign-in" className="text-blue-600 underline">
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  const role = user?.publicMetadata?.role as string | undefined;

  if (role !== "developer") {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "#b91c1c", fontWeight: 600, marginBottom: 8 }}>
          Accès refusé
        </div>
        <div style={{ fontSize: 14, color: "#555" }}>
          Ce compte n’a pas accès à l’espace développeur.
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
