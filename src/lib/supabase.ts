// src/lib/supabase.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("❌ VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquent.");
}

/**
 * Client Supabase “vivant”.
 * On le recrée quand on attache/rafraîchit le token Clerk.
 */
export let supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

let _lastToken: string | null = null;

/**
 * Ajoute Authorization: Bearer <token> sur TOUTES les requêtes.
 * Si token inchangé, on ne recrée pas le client.
 */
export function attachClerkToken(token?: string | null) {
  const t = token || null;
  if (t === _lastToken) return; // évite recréations inutiles
  _lastToken = t;

  supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: t ? { Authorization: `Bearer ${t}` } : {},
    },
  });

  // debug léger
  console.log("[Supabase] Clerk token attached?", !!t);
}

export function getAttachedTokenForDebug() {
  return _lastToken;
}

export type SupabaseClientType = SupabaseClient<Database>;