// src/lib/supabaseClient.ts (ou dans /components/supabase si tu veux le laisser là)
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);
