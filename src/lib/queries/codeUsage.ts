// src/lib/queries/codeUsage.ts
import { supabase } from "../supabase";

// Nombre de consultations passées (les plus récentes) scannées pour bâtir les stats d'usage.
const HISTORY_LIMIT = 200;

export type CodeUsage<T> = {
  recent: T[];
  frequent: T[];
};

export type ActUsageItem = {
  id: string;
  code: string;
  title: string;
  key_letter: string | null;
  coefficient: number | null;
  profession_scope: string | null;
  source: string | null;
};

export type DiagnosisUsageItem = {
  id: string;
  code: string;
  title: string;
  chapter_roman: string | null;
  chapter_title: string | null;
  code_range: string | null;
  source: string;
};

function rankByRecencyAndCount<T>(
  lastSeen: Map<string, number>,
  counts: Map<string, number>,
  limit: number
): { recentIds: string[]; frequentIds: string[] } {
  const recentIds = [...lastSeen.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  const frequentIds = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  return { recentIds, frequentIds };
}

/**
 * Actes les plus récemment / fréquemment utilisés par ce médecin,
 * dérivés de son historique de consultations (consultations.acts).
 */
export async function getActUsage(
  doctorId: string,
  limit = 8
): Promise<CodeUsage<ActUsageItem>> {
  const { data, error } = await supabase
    .from("consultations")
    .select("created_at, acts")
    .eq("doctor_id", doctorId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error || !data) {
    if (error) console.warn("[codeUsage] getActUsage error:", error);
    return { recent: [], frequent: [] };
  }

  const lastSeen = new Map<string, number>();
  const counts = new Map<string, number>();
  const items = new Map<string, ActUsageItem>();

  for (const row of data) {
    const ts = new Date(row.created_at as string).getTime();
    const acts = Array.isArray(row.acts) ? (row.acts as any[]) : [];

    for (const a of acts) {
      if (!a?.act_id || a.origin !== "catalog") continue;
      const id = String(a.act_id);

      counts.set(id, (counts.get(id) ?? 0) + 1);
      if (!lastSeen.has(id)) lastSeen.set(id, ts);
      if (!items.has(id)) {
        items.set(id, {
          id,
          code: a.code,
          title: a.title,
          key_letter: a.key_letter ?? null,
          coefficient: a.coefficient ?? null,
          profession_scope: a.profession_scope ?? null,
          source: a.source ?? null,
        });
      }
    }
  }

  const { recentIds, frequentIds } = rankByRecencyAndCount(lastSeen, counts, limit);

  return {
    recent: recentIds.map((id) => items.get(id)).filter(Boolean) as ActUsageItem[],
    frequent: frequentIds.map((id) => items.get(id)).filter(Boolean) as ActUsageItem[],
  };
}

/**
 * Affections les plus récemment / fréquemment utilisées par ce médecin,
 * dérivées de son historique de consultations (diagnosis_code_id(s)).
 */
export async function getDiagnosisUsage(
  doctorId: string,
  limit = 8
): Promise<CodeUsage<DiagnosisUsageItem>> {
  const { data, error } = await supabase
    .from("consultations")
    .select("created_at, diagnosis_code_id, diagnosis_code_ids")
    .eq("doctor_id", doctorId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error || !data) {
    if (error) console.warn("[codeUsage] getDiagnosisUsage error:", error);
    return { recent: [], frequent: [] };
  }

  const lastSeen = new Map<string, number>();
  const counts = new Map<string, number>();

  for (const row of data) {
    const ts = new Date(row.created_at as string).getTime();
    const ids = new Set<string>();

    if (Array.isArray(row.diagnosis_code_ids)) {
      for (const id of row.diagnosis_code_ids as string[]) {
        if (id) ids.add(id);
      }
    }
    if (row.diagnosis_code_id) ids.add(String(row.diagnosis_code_id));

    for (const id of ids) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
      if (!lastSeen.has(id)) lastSeen.set(id, ts);
    }
  }

  const { recentIds, frequentIds } = rankByRecencyAndCount(lastSeen, counts, limit);

  const allIds = Array.from(new Set([...recentIds, ...frequentIds]));
  if (!allIds.length) return { recent: [], frequent: [] };

  const { data: rows, error: rowsError } = await supabase
    .from("diagnosis_codes")
    .select("id, code, title, chapter_roman, chapter_title, code_range, source")
    .in("id", allIds);

  if (rowsError || !rows) {
    if (rowsError) console.warn("[codeUsage] getDiagnosisUsage lookup error:", rowsError);
    return { recent: [], frequent: [] };
  }

  const byId = new Map(rows.map((r) => [r.id, r as DiagnosisUsageItem]));

  return {
    recent: recentIds.map((id) => byId.get(id)).filter(Boolean) as DiagnosisUsageItem[],
    frequent: frequentIds.map((id) => byId.get(id)).filter(Boolean) as DiagnosisUsageItem[],
  };
}
