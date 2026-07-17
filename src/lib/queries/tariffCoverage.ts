// src/lib/queries/tariffCoverage.ts
import { supabase } from "../supabase";

/**
 * Lettres-clé (key_letter) pour lesquelles cet assureur a un tarif actif configuré.
 * Sert à avertir le médecin qu'un acte choisi n'a pas de tarif pour l'assureur du patient
 * (et donc ne sera pas correctement remboursé / tombera en `missing_tariffs`).
 */
export async function getInsurerCoveredKeyLetters(insurerId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("insurer_tariffs")
    .select("key_letter")
    .eq("insurer_id", insurerId)
    .eq("is_active", true);

  if (error || !data) {
    if (error) console.warn("[tariffCoverage] getInsurerCoveredKeyLetters error:", error);
    return new Set();
  }

  return new Set(data.map((r) => r.key_letter).filter(Boolean) as string[]);
}
