// src/lib/supabase.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("❌ VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquent.");
}

/**
 * Client Supabase “vivant”. On le recrée quand on attache/rafraîchit le token Clerk,
 * et comme c’est un export ESM “live binding”, tous les imports voient la mise à jour.
 */
export let supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/**
 * À appeler quand on a un JWT Clerk (template “supabase” conseillé).
 * Ajoute Authorization: Bearer <token> sur TOUTES les requêtes.
 */
export function attachClerkToken(token?: string | null) {
  supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
}

// Type utilitaire si besoin
export type SupabaseClientType = SupabaseClient<Database>;

