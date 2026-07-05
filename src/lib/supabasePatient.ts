// src/lib/supabasePatient.ts
// Client Supabase dédié à l'espace patient : authentification téléphone/OTP
// via Supabase Auth. Volontairement séparé de `supabase` (lib/supabase.ts),
// qui lui sert de canal Clerk pour le staff — les deux ne doivent pas
// partager le même token d'Authorization.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabasePatient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: "mediconnect-patient-auth",
    persistSession: true,
    autoRefreshToken: true,
  },
});

export function getSupabaseFunctionsUrl(fnName: string) {
  return `${SUPABASE_URL}/functions/v1/${fnName}`;
}
