//src/hooks/useDoctorContext.ts
import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "../lib/supabase";

type DoctorContext = {
  clinic_id: string;
  doctor_id: string;
} | null;

export function useDoctorContext(): DoctorContext {
  const { user } = useUser();
  const [ctx, setCtx] = useState<DoctorContext>(null);

  useEffect(() => {
    if (!user) return;

    const clerkId = user.id;
    const email = user.primaryEmailAddress?.emailAddress ?? null;

    async function load() {
      try {
        let q = supabase
          .from("clinic_staff")
          .select("id, clinic_id, role, email, clerk_user_id")
          .eq("role", "doctor")
          .limit(1);

        if (clerkId) {
          q = q.eq("clerk_user_id", clerkId);      //  clé principale
        } else if (email) {
          q = q.eq("email", email);
        }

        const { data, error } = await q.maybeSingle();

        if (error || !data?.clinic_id) {
          console.warn("useDoctorContext: aucun staff trouvé", error);
          setCtx(null);
          return;
        }

        setCtx({
          clinic_id: String(data.clinic_id),
          doctor_id: String(data.id),             //  id de la ligne clinic_staff
        });
      } catch (e) {
        console.error("useDoctorContext error", e);
        setCtx(null);
      }
    }

    load();
  }, [user?.id]); // relance si l'utilisateur change

  return ctx;
}