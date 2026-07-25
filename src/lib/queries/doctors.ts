// src/lib/queries/doctors.ts
import { supabase } from "../supabase";

export async function getDoctorPerformance(doctorId: string, period: string) {
  try {
    const { data, error } = await supabase.rpc("get_doctor_performance", {
      input_doctor_id: doctorId,
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