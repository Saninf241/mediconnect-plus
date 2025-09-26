// src/components/auth/PrivateRouteByRole.tsx
import * as React from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { supabase } from "../../lib/supabase";
import { normalizeRole } from "./role-utils";

type Props = {
  allowedRole: "secretary" | "doctor" | "admin" | "assurer" | "pharmacist";
  establishmentUser?: any;      // si tu la passes déjà depuis App
  children: React.ReactNode;
};

export default function PrivateRouteByRole({ allowedRole, establishmentUser, children }: Props) {
  const wanted = normalizeRole(allowedRole);
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const [state, setState] = React.useState<
    { phase: "loading" | "ok" | "forbidden"; role?: string | null; reason?: string }
  >({ phase: "loading" });

  React.useEffect(() => {
    let cancelled = false;

    async function resolveRole() {
      // 0) Clerk pas prêt → on attend (ClerkGuard gère déjà, mais on sécurise)
      if (!authLoaded) return;
      if (!isSignedIn) {
        if (!cancelled) setState({ phase: "forbidden", reason: "not-signed" });
        return;
      }

      // 1) Rôle déjà fourni en prop (depuis App)
      if (establishmentUser?.role) {
        const ok = normalizeRole(establishmentUser.role) === wanted;
        if (!cancelled) setState({ phase: ok ? "ok" : "forbidden", role: establishmentUser.role });
        return;
      }

      // 2) localStorage
      try {
        const raw = localStorage.getItem("establishmentUserSession");
        if (raw) {
          const s = JSON.parse(raw);
          if (s?.role) {
            const ok = normalizeRole(s.role) === wanted;
            if (!cancelled) setState({ phase: ok ? "ok" : "forbidden", role: s.role });
            return;
          }
        }
      } catch {}

      // 3) fallback DB (lecture unique)
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!email) {
        if (!cancelled) setState({ phase: "forbidden", reason: "no-email" });
        return;
      }

      const { data, error } = await supabase
        .from("clinic_staff")
        .select("id, clinic_id, role, email")
        .eq("email", email)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data?.role) {
        setState({ phase: "forbidden", reason: "no-role" });
        return;
      }

      // on normalise et on met en cache local pour la suite
      const sessionObj = { id: data.id, role: normalizeRole(data.role), email: data.email, clinicId: data.clinic_id };
      localStorage.setItem("establishmentUserSession", JSON.stringify(sessionObj));

      const ok = sessionObj.role === wanted;
      setState({ phase: ok ? "ok" : "forbidden", role: sessionObj.role });
    }

    resolveRole();
    return () => { cancelled = true; };
  }, [authLoaded, isSignedIn, allowedRole, establishmentUser, user]);

  // ——— UI d’attente : AUCUNE redirection ici ———
  if (state.phase === "loading") {
    return <div style={{ padding: 24 }}>Vérification des droits…</div>;
  }

  // ——— Accès refusé : on affiche un message (pas de Navigate) ———
  if (state.phase === "forbidden") {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "#b91c1c", fontWeight: 600, marginBottom: 8 }}>
          Accès refusé
        </div>
        <div style={{ marginBottom: 8 }}>
          Rôle requis : <b>{allowedRole}</b>
          {state.role ? <> — rôle détecté : <b>{state.role}</b></> : null}
        </div>
        <div style={{ fontSize: 14, color: "#555" }}>
          Ouvrez “Mes Patients” pour initialiser votre session, ou contactez l’administrateur.
        </div>
      </div>
    );
  }

  // ——— Accès OK ———
  return <>{children}</>;
}

