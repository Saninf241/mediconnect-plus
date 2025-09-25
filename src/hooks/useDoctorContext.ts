import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useDoctorContext() {
  const { user: clerkUser } = useUser();
  const [doctorInfo, setDoctorInfo] = useState<{
    doctor_id: string;
    clinic_id: string;
  } | null>(null);

  useEffect(() => {
    const fetchDoctorData = async () => {
      // 🔹 1. Tentative via Clerk
      const userId = clerkUser?.id;
      if (userId) {
        console.log("🧩 Clerk détecté, récupération via user.id =", userId);

        const { data, error } = await supabase
          .from("clinic_staff")
          .select("id, clinic_id")
          .eq("user_id", userId)
          .single();

        if (data) {
          setDoctorInfo({
            doctor_id: data.id,
            clinic_id: data.clinic_id,
          });
          return;
        } else {
          console.warn("⚠️ Clerk actif mais pas de data dans clinic_staff", error);
        }
      }

      // 🔹 2. Fallback via localStorage
      const local = localStorage.getItem("establishmentUserSession");
      if (local) {
        const parsed = JSON.parse(local);

        // 👉 Correction ici : on accède à `parsed.user`, pas `parsed` directement
        const user = parsed.user;
        if (user?.role === "doctor" && user?.id && user?.clinicId) {
          console.log("📦 Données médecin récupérées depuis localStorage :", user);
          setDoctorInfo({
            doctor_id: user.id,
            clinic_id: user.clinicId,
          });
        } else {
          console.warn("⚠️ localStorage incomplet ou rôle incorrect :", parsed);
        }
      } else {
        console.warn("❌ Aucun utilisateur trouvé (ni Clerk ni localStorage)");
      }
    };

    fetchDoctorData();
  }, [clerkUser]);

  return doctorInfo;
}
