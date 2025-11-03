// src/components/auth/RoleRedirect.tsx
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type ClinicJoined = {
  role: string | null;
  clinic_id: string | null;
  clinics: { id: string; name: string | null; type: string | null } | null;
};

const normalize = (r?: string | null) => (r || "").toString().trim().toLowerCase();

export default function RoleRedirect() {
  const { isLoaded, isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const [routing, setRouting] = useState<null | string>(null);

  const email = useMemo(() => {
    return (
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      null
    );
  }, [user]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      navigate("/sign-in", { replace: true });
      return;
    }

    (async () => {
      // 1) rôle “source de vérité” si tu l’as déjà mis dans Clerk
      let role = normalize(user.publicMetadata?.role as string | undefined);

      // 2) Fallback: si rôle manquant → on le déduit depuis clinic_staff
      let clinicType: string | null = null;

      if (!role || !email) {
        const { data } = await supabase
          .from("clinic_staff")
          .select(
            `
            role,
            clinic_id,
            clinics:clinics ( id, name, type )
          `
          )
          .eq("email", email ?? "")
          .maybeSingle<ClinicJoined>();

        if (data) {
          role = normalize(data.role);
          clinicType = data.clinics?.type ? data.clinics.type.toLowerCase() : null;
        }
      } else {
        // On a déjà un rôle via Clerk → on récupère le type d’établissement pour router
        if (email) {
          const { data } = await supabase
            .from("clinic_staff")
            .select(
              `
              clinics:clinics ( id, name, type )
            `
            )
            .eq("email", email)
            .maybeSingle<ClinicJoined>();
          clinicType = data?.clinics?.type ? data.clinics.type.toLowerCase() : null;
        }
      }

      // 3) Décision de route
      switch (role) {
        case "admin":
        case "owner":
        case "manager":
          setRouting("/multispecialist/admin/dashboard");
          break;

        case "secretary":
          setRouting("/multispecialist/secretary/patients");
          break;

        case "doctor": {
          // multi vs spécialiste simple
          if (clinicType === "multi_specialist" || clinicType === "multi-specialist") {
            setRouting("/multispecialist/doctor/dashboard");
          } else {
            setRouting("/doctor"); // ton index = dashboard
          }
          break;
        }

        case "assurer":
        case "assureur":
          setRouting("/assureur/reports");
          break;

        case "pharmacist":
        case "pharmacien":
          setRouting("/pharmacy");
          break;

        default:
          setRouting("/unauthorized");
      }
    })();
  }, [isLoaded, isSignedIn, user, email, navigate]);

  useEffect(() => {
    if (routing) navigate(routing, { replace: true });
  }, [routing, navigate]);

  return <div style={{ padding: 24 }}>Connexion…</div>;
}
