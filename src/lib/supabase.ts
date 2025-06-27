// src/lib/supabase.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("❌ Erreur : les variables d'environnement VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY sont manquantes.");
}

// Client Supabase principal
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Type optionnel pour les hooks ou typage avancé (pro)
export type SupabaseClientType = SupabaseClient<Database>;
