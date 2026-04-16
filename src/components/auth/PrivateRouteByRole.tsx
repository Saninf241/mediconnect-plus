// src/components/auth/PrivateRouteByRole.tsx
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "../../lib/supabase";
import { normalizeRole, type AppRole } from "./role-utils";

type Allowed = AppRole;

export default function PrivateRouteByRole({
  allowedRole,
  children,
}: React.PropsWithChildren<{ allowedRole: Allowed }>) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [effectiveRole, setEffectiveRole] = useState<AppRole | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  const roleFromClerk = useMemo(
    () => normalizeRole(user?.publicMetadata?.role as string | undefined),
    [user]
  );

  useEffect(() => {
    let cancelled = false;

    async function resolveRole() {
      if (!isLoaded) return;

      setLoadingRole(true);
      setEffectiveRole(null);

      if (!isSignedIn || !user) {
        if (!cancelled) {
          setEffectiveRole(null);
          setLoadingRole(false);
        }
        return;
      }

      if (roleFromClerk) {
        if (!cancelled) {
          setEffectiveRole(roleFromClerk);
          setLoadingRole(false);
        }
        return;
      }

      const email =
        user.primaryEmailAddress?.emailAddress ||
        user.emailAddresses?.[0]?.emailAddress ||
        null;

      const clerkId = user.id;

      let appRole: AppRole | null = null;

      // clinic_staff
      if (clerkId) {
        const { data } = await supabase
          .from("clinic_staff")
          .select("role")
          .eq("clerk_user_id", clerkId)
          .maybeSingle();

        appRole = normalizeRole(data?.role);
      }

      if (!appRole && email) {
        const { data } = await supabase
          .from("clinic_staff")
          .select("role")
          .eq("email", email)
          .maybeSingle();

        appRole = normalizeRole(data?.role);
      }

      // insurer_staff
      if (!appRole && clerkId) {
        const { data } = await supabase
          .from("insurer_staff")
          .select("id")
          .eq("clerk_user_id", clerkId)
          .maybeSingle();

        if (data) appRole = "assurer";
      }

      if (!appRole && email) {
        const { data } = await supabase
          .from("insurer_staff")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (data) appRole = "assurer";
      }

      // pharmacy_staff
      if (!appRole && clerkId) {
        const { data } = await supabase
          .from("pharmacy_staff")
          .select("id")
          .eq("clerk_user_id", clerkId)
          .maybeSingle();

        if (data) appRole = "pharmacist";
      }

      if (!appRole && email) {
        const { data } = await supabase
          .from("pharmacy_staff")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (data) appRole = "pharmacist";
      }

      if (!cancelled) {
        setEffectiveRole(appRole);
        setLoadingRole(false);
      }
    }

    resolveRole();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, roleFromClerk]);

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

  if (!effectiveRole) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "#b91c1c", fontWeight: 600, marginBottom: 8 }}>
          Accès refusé
        </div>
        <div style={{ marginBottom: 8 }}>
          Aucun rôle n’a été trouvé pour ce compte.
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
          Rôle requis : <b>{allowedRole}</b> — rôle détecté : <b>{effectiveRole}</b>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}