// src/hooks/useClinicId.ts
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useClinicId() {
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [loadingClinic, setLoadingClinic] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        // 1) lire localStorage (plusieurs clés / formats)
        const keys = ["establishmentUserSession", "establishmentUser", "pharmacyUserSession"];
        let parsed: any = null;

        for (const k of keys) {
          const raw = localStorage.getItem(k);
          if (!raw) continue;
          try { parsed = JSON.parse(raw); break; } catch {}
        }

        const id =
          parsed?.clinicId ||
          parsed?.clinic_id ||
          parsed?.clinic?.id ||
          parsed?.currentClinicId ||
          parsed?.user?.clinicId ||
          parsed?.user?.clinic_id ||
          parsed?.user?.clinic?.id;

        if (id) {
          setClinicId(id);
          return;
        }

        // 2) fallback par email (lecture de sa propre ligne clinic_staff)
        const email =
          parsed?.user?.email ||
          parsed?.email ||
          localStorage.getItem("userEmail") ||
          "";

        if (email) {
          const { data, error } = await supabase
            .from("clinic_staff")
            .select("clinic_id")
            .eq("email", email.toLowerCase())
            .maybeSingle();

          if (!error && data?.clinic_id) {
            setClinicId(data.clinic_id);
            return;
          }
        }
      } finally {
        setLoadingClinic(false);
      }
    };

    run();
  }, []);

  return { clinicId, loadingClinic };
}
