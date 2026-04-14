// src/lib/queries/doctors.ts
import { supabase } from "../supabase";

export async function getDoctorPerformance(clerkUserId: string, period: string) {
  try {
    const { data: staff, error: staffError } = await supabase
      .from("clinic_staff")
      .select("id")
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle();

    if (staffError) {
      console.error("[getDoctorPerformance] clinic_staff error:", staffError.message);
      return null;
    }

    if (!staff?.id) {
      console.warn("[getDoctorPerformance] Aucun médecin trouvé pour :", clerkUserId);
      return null;
    }

    const { data, error } = await supabase.rpc("get_doctor_performance", {
      input_doctor_id: staff.id,
      input_period: period,
    });

    if (error) {
      console.error("[getDoctorPerformance] Supabase RPC error:", error.message);
      return null;
    }

    if (Array.isArray(data)) {
      return data[0] ?? null;
    }

    return data ?? null;
  } catch (err) {
    console.error("[getDoctorPerformance] Unexpected error:", err);
    return null;
  }
}