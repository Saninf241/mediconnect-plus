// src/components/auth/PrivateRouteByRole.tsx
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "../../lib/supabase";

type Allowed = "secretary" | "doctor" | "admin" | "assurer" | "pharmacist";
type AppRole = Allowed;

const normalize = (r?: string | null) =>
  (r || "").toString().trim().toLowerCase();

export default function PrivateRouteByRole({
  allowedRole,
  children,
}: React.PropsWithChildren<{ allowedRole: Allowed }>) {
  const { isLoaded, isSignedIn, user } = useUser();

  // 1) Rôle éventuel stocké dans Clerk (publicMetadata.role)
  const roleFromClerk = useMemo(
    () => normalize(user?.publicMetadata?.role as string | undefined),
    [user]
  );

  const initialRole: AppRole | null =
    roleFromClerk && ["doctor", "admin", "secretary", "assurer", "pharmacist"].includes(
      roleFromClerk as AppRole
    )
      ? (roleFromClerk as AppRole)
      : null;

  // Rôle effectif + état de chargement
  const [effectiveRole, setEffectiveRole] = useState<AppRole | null>(initialRole);
  const [loadingRole, setLoadingRole] = useState<boolean>(true);

  useEffect(() => {
    // tant que Clerk n'est pas chargé, on ne fait rien
    if (!isLoaded) return;

    // si déjà un rôle valide via Clerk → terminé
    if (effectiveRole) {
      setLoadingRole(false);
      return;
    }

    // si pas connecté → pas la peine d'aller en DB
    if (!isSignedIn || !user) {
      setLoadingRole(false);
      return;
    }

    const email =
      user.primaryEmailAddress?.emailAddress ||
      user.emailAddresses?.[0]?.emailAddress ||
      null;
    const clerkId = user.id;

    (async () => {
      try {
        let appRole: AppRole | null = null;

        // ---------- 1) Recherche dans clinic_staff ----------
        if (email || clerkId) {
          const orFilter = [
            clerkId ? `clerk_user_id.eq.${clerkId}` : "",
            email ? `email.eq.${email}` : "",
          ]
            .filter(Boolean)
            .join(",");

          if (orFilter) {
            const { data: staff } = await supabase
              .from("clinic_staff")
              .select("role")
              .or(orFilter)
              .maybeSingle();

            if (staff?.role) {
              const r = normalize(staff.role);
              if (r === "doctor" || r === "admin" || r === "secretary") {
                appRole = r;
              }
            }
          }
        }

        // ---------- 2) Sinon, recherche dans insurer_staff ----------
        if (!appRole && (email || clerkId)) {
          const orFilterIns = [
            clerkId ? `clerk_user_id.eq.${clerkId}` : "",
            email ? `email.eq.${email}` : "",
          ]
            .filter(Boolean)
            .join(",");

          if (orFilterIns) {
            const { data: insurerStaff } = await supabase
              .from("insurer_staff")
              .select("role")
              .or(orFilterIns)
              .maybeSingle();

            if (insurerStaff) {
              // quel que soit insurer_staff.role → rôle applicatif = "assurer"
              appRole = "assurer";
            }
          }
        }

        // ---------- 3) (plus tard) pharmacie, etc. ----------

        if (appRole) {
          setEffectiveRole(appRole);
        } else {
          setEffectiveRole(null); // aucun rôle trouvé
        }
      } finally {
        setLoadingRole(false);
      }
    })();
  }, [isLoaded, isSignedIn, user, effectiveRole]);

  // ================== GUARD ==================

  if (!isLoaded || loadingRole) {
    return <div style={{ padding: 24 }}>Chargement du rôle…</div>;
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

  // Cas où aucun rôle n'a été trouvé en DB ni dans Clerk
  if (!effectiveRole) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "#b91c1c", fontWeight: 600, marginBottom: 8 }}>
          Accès refusé
        </div>
        <div style={{ marginBottom: 8 }}>
          Aucun rôle n’a été trouvé pour ce compte. Vérifie que cet email est
          bien présent dans <code>clinic_staff</code> ou{" "}
          <code>insurer_staff</code>.
        </div>
      </div>
    );
  }

  if (effectiveRole !== allowedRole) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "#b91c1c", fontWeight: 600, marginBottom: 8 }}>
          Accès refusé
        </div>
        <div style={{ marginBottom: 8 }}>
          Rôle requis : <b>{allowedRole}</b> — rôle détecté :{" "}
          <b>{effectiveRole}</b>
        </div>
        <div style={{ fontSize: 14, color: "#555" }}>
          Ouvrez “Se connecter” et utilisez un compte autorisé pour cette
          section.
        </div>
      </div>
    );
  }

  return <>{children}</>;
}


