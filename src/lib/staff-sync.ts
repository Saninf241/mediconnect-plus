// src/lib/staff-sync.ts
import { supabase } from "./supabase";
import { useUser } from "@clerk/clerk-react";

export async function ensureStaffMapping(params: {
  clerkUserId: string;
  email: string;
  clinicId: string;
  role: "admin" | "doctor" | "secretary" | "assurer" | "pharmacist";
  name?: string;
}) {
  const { clerkUserId, email, clinicId, role, name } = params;

  const { data: exists } = await supabase
    .from("clinic_staff")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (exists) return exists.id;

  const { data, error } = await supabase
    .from("clinic_staff")
    .insert({ clerk_user_id: clerkUserId, email, clinic_id: clinicId, role, name })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data?.id;
}
