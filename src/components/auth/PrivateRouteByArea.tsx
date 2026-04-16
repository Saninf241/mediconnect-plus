// src/components/auth/PrivateRouteByArea.tsx
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { resolveAccessContext, type AppArea, type AccessContext } from "./access-context";

export default function PrivateRouteByArea({
  allowedArea,
  children,
}: React.PropsWithChildren<{ allowedArea: AppArea }>) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [ctx, setCtx] = useState<AccessContext | null>(null);
  const [loading, setLoading] = useState(true);

  const email = useMemo(
    () =>
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      null,
    [user]
  );

  const roleFromClerk = useMemo(
    () => (user?.publicMetadata?.role as string | undefined) ?? null,
    [user]
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!isLoaded) return;

      setLoading(true);
      setCtx(null);

      if (!isSignedIn || !user) {
        if (!cancelled) {
          setCtx(null);
          setLoading(false);
        }
        return;
      }

      try {
        const access = await resolveAccessContext({
          clerkUserId: user.id,
          email,
          roleFromClerk,
        });

        if (!cancelled) {
          setCtx(access);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, email, roleFromClerk]);

  if (!isLoaded || loading) {
    return <div style={{ padding: 24 }}>Chargement de l’accès…</div>;
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

  if (!ctx) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "#b91c1c", fontWeight: 600, marginBottom: 8 }}>
          Accès refusé
        </div>
        <div style={{ marginBottom: 8 }}>
          Aucun contexte d’accès valide n’a été trouvé pour ce compte.
        </div>
      </div>
    );
  }

  if (ctx.area !== allowedArea) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "#b91c1c", fontWeight: 600, marginBottom: 8 }}>
          Accès refusé
        </div>
        <div style={{ marginBottom: 8 }}>
          Zone requise : <b>{allowedArea}</b> — zone détectée : <b>{ctx.area}</b>
        </div>
        <div style={{ fontSize: 14, color: "#555" }}>
          Ce compte est authentifié, mais n’appartient pas à cet espace.
        </div>
      </div>
    );
  }

  return <>{children}</>;
}