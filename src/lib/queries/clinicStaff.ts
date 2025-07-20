import { supabase } from "../../lib/supabase";

export async function getStaffByEmail(email: string) {
  const { data, error } = await supabase
    .from("clinic_staff")
    .select("*")
    .eq("email", email)
    .single();

  if (error) {
    console.error("Erreur Supabase:", error);
    return null;
  }

  return data;
}
