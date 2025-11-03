// src/components/auth/PrivateRouteByRole.tsx
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "../../lib/supabase";

type Allowed = "secretary" | "doctor" | "admin" | "assurer" | "pharmacist";
const normalize = (r?: string | null) => (r || "").toString().trim().toLowerCase();

export default function PrivateRouteByRole({
  allowedRole,
  children,
}: React.PropsWithChildren<{ allowedRole: Allowed }>) {
  const { isLoaded, isSignedIn, user } = useUser();

  // 1) rôle depuis Clerk (si tu l'as mis dans publicMetadata)
  const roleFromClerk = useMemo(
    () => normalize(user?.publicMetadata?.role as string | undefined),
    [user]
  );

  // 2) rôle effectif (Clerk, sinon fallback DB)
  const [effectiveRole, setEffectiveRole] = useState<string | null>(
    roleFromClerk || null
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (effectiveRole) return; // déjà trouvé via Clerk

    const email =
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      null;
    if (!email) return;

    (async () => {
      // a) on tente d'abord la ligne "doctor"
      let role: string | null = null;

      const qDoctor = await supabase
        .from("clinic_staff")
        .select("role")
        .eq("email", email)
        .eq("role", "doctor")
        .maybeSingle();

      if (qDoctor.data?.role) {
        role = qDoctor.data.role;
      } else {
        // b) sinon, on prend n'importe quelle ligne (au cas où tu n'aurais qu'un seul enregistrement)
        const qAny = await supabase
          .from("clinic_staff")
          .select("role")
          .eq("email", email)
          .limit(1)
          .maybeSingle();

        if (qAny.data?.role) role = qAny.data.role;
      }

      if (role) setEffectiveRole(normalize(role));
    })();
  }, [isLoaded, isSignedIn, user, effectiveRole]);

  // --- Garde ---

  if (!isLoaded) return <div style={{ padding: 24 }}>Vérification des droits…</div>;
  if (!isSignedIn)
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "#b91c1c", fontWeight: 600, marginBottom: 8 }}>Accès refusé</div>
        <div style={{ fontSize: 14, color: "#555" }}>
          Vous n’êtes pas connecté. <a href="/sign-in" className="text-blue-600 underline">Se connecter</a>
        </div>
      </div>
    );

  // ⛔ IMPORTANT : tant qu'on n'a pas le rôle effectif, on ATTEND (pour éviter un faux "refusé")
  if (!effectiveRole) return <div style={{ padding: 24 }}>Chargement du rôle…</div>;

  if (effectiveRole !== allowedRole) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "#b91c1c", fontWeight: 600, marginBottom: 8 }}>Accès refusé</div>
        <div style={{ marginBottom: 8 }}>
          Rôle requis : <b>{allowedRole}</b> — rôle détecté : <b>{effectiveRole}</b>
        </div>
        <div style={{ fontSize: 14, color: "#555" }}>
          Ouvrez “Se connecter” et utilisez un compte autorisé pour cette section.
        </div>
      </div>
    );
  }

  return <>{children}</>;
}


