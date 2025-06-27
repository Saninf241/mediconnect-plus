// src/lib/queries/clinics.ts
import { supabase } from "../supabase"; // chemin correct depuis lib/queries
// ou "../../../lib/supabase" si tu es plus profond

export async function getAllClinics() {
  const { data, error } = await supabase.from("clinics").select("id, name");
  if (error) throw new Error(error.message);
  return data;
}
