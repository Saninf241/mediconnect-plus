// src/lib/queries/doctors.ts
import { supabase } from "../supabase";

export async function getDoctorPerformance(clerkUserId: string) {
  try {
    // 1) Retrouver le médecin dans clinic_staff via clerk_user_id
    const { data: staff, error: staffError } = await supabase
      .from("clinic_staff")
      .select("id, clerk_user_id, role")
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle();

    if (staffError) {
      console.error("[getDoctorPerformance] clinic_staff error:", staffError.message);
      return null;
    }

    if (!staff?.id) {
      console.warn(
        "[getDoctorPerformance] Aucun médecin trouvé dans clinic_staff pour clerk_user_id:",
        clerkUserId
      );
      return null;
    }

    // 2) Appeler le RPC avec le vrai UUID du médecin
    const { data, error } = await supabase.rpc("get_doctor_performance", {
      input_doctor_id: staff.id,
    });

    if (error) {
      console.error("[getDoctorPerformance] Supabase RPC error:", error.message);
      return null;
    }

    // Selon comment le RPC retourne les données :
    // - parfois objet direct
    // - parfois tableau avec une seule ligne
    if (Array.isArray(data)) {
      return data[0] ?? null;
    }

    return data ?? null;
  } catch (err) {
    console.error("[getDoctorPerformance] Unexpected error:", err);
    return null;
  }
}
