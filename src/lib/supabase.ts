// src/lib/supabase.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("❌ VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquent.");
}

/**
 * Token Clerk stocké en mémoire (non persistant).
 * On le met à jour depuis ton app (après login Clerk).
 */
let _clerkToken: string | null = null;

/**
 * Client Supabase unique, avec headers dynamiques.
 * -> Pas besoin de recréer le client à chaque refresh token.
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    global: {
      // IMPORTANT: les headers sont évalués au moment de la requête
      fetch: (url, options = {}) => {
        const headers = new Headers(options.headers || {});

        // apikey toujours présent (utile pour functions, storage, etc.)
        if (!headers.has("apikey")) headers.set("apikey", SUPABASE_ANON_KEY);

        // Authorization si token Clerk dispo
        if (_clerkToken) headers.set("Authorization", `Bearer ${_clerkToken}`);

        return fetch(url, { ...options, headers });
      },
    },
  }
);

/**
 * À appeler quand tu récupères un token Clerk.
 * Exemple: attachClerkToken(await getToken({ template: "supabase" }))
 */
export function attachClerkToken(token?: string | null) {
  _clerkToken = token || null;
  console.log("[Supabase] Clerk token attached?", !!_clerkToken);
}

export function getAttachedTokenForDebug() {
  return _clerkToken;
}

export function getSupabaseAnonKey() {
  return SUPABASE_ANON_KEY;
}

export function getSupabaseUrl() {
  return SUPABASE_URL;
}

export type SupabaseClientType = SupabaseClient<Database>;