import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Input } from "../input";
import { Button } from "../button";

export type DiagnosisCodeRow = {
  id: string;
  code: string;
  title: string;
  chapter_roman: string | null;
  chapter_title: string | null;
  code_range: string | null;
  source: string;
};

export type SelectedItem = {
  id: string;
  label: string; // "A01 - PALUDISME"
  row: DiagnosisCodeRow;
};

/**
 * ✅ Props multi (recommandé)
 */
type MultiProps = {
  mode?: "multi";
  valueIds?: string[] | null;
  valueTexts?: string[] | null;
  source?: string;
  disabled?: boolean;
  maxItems?: number;

  onChange: (items: SelectedItem[]) => void;
  onPrimaryChange?: (item: SelectedItem | null) => void;
};

/**
 * ✅ Props single (compat)
 */
type SingleProps = {
  mode?: "single";
  valueId?: string | null;
  valueText?: string | null;
  source?: string;
  disabled?: boolean;

  onSelect: (row: DiagnosisCodeRow | null) => void;
};

type Props = MultiProps | SingleProps;

function normalize(s: string) {
  return s.trim();
}
function escapeLike(s: string) {
  return s.replace(/[%_]/g, "\\$&");
}
function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function DiagnosisSelector(props: Props) {
  const mode = props.mode ?? ("onChange" in props ? "multi" : "single");
  const source = props.source ?? "ICD10-CNAMGS-2012";
  const disabled = props.disabled ?? false;
  const maxItems = "onChange" in props ? props.maxItems ?? 5 : 1;

  // input de recherche
  const [query, setQuery] = useState<string>("");

  // résultats recherche
  const [results, setResults] = useState<DiagnosisCodeRow[]>([]);
  const [loading, setLoading] = useState(false);

  // sélection multi
  const [selected, setSelected] = useState<SelectedItem[]>([]);
  const [primaryId, setPrimaryId] = useState<string | null>(null);

  // chapitres
  const [chapters, setChapters] = useState<
    { chapter_title: string; chapter_roman: string | null }[]
  >([]);
  const [chapterOpen, setChapterOpen] = useState(false);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [chapterRows, setChapterRows] = useState<DiagnosisCodeRow[]>([]);
  const [chapterLoading, setChapterLoading] = useState(false);

  // ✅ init depuis parent
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (mode === "single") {
        // si valueText fourni, on met dans query (juste pour afficher)
        const valueText = (props as SingleProps).valueText ?? "";
        if (valueText) setQuery(valueText);
        return;
      }

      // mode multi
      if (selected.length > 0) return;

      const valueIds = ((props as MultiProps).valueIds ?? []).filter(Boolean) as string[];
      const valueTexts = ((props as MultiProps).valueTexts ?? []).filter(Boolean) as string[];

      // Si pas d'IDs mais des textes => on crée des "fake rows" (fallback)
      if (!valueIds.length && valueTexts.length) {
        const fake = valueTexts.map((t, idx) => ({
          id: `text-${idx}`,
          label: t,
          row: {
            id: `text-${idx}`,
            code: t.split(" - ")[0] ?? t,
            title: t,
            chapter_roman: null,
            chapter_title: null,
            code_range: null,
            source,
          } as DiagnosisCodeRow,
        }));

        if (cancelled) return;
        setSelected(fake);
        setPrimaryId(fake[0]?.id ?? null);

        (props as MultiProps).onChange(fake);
        (props as MultiProps).onPrimaryChange?.(fake[0] ?? null);
        return;
      }

      if (!valueIds.length) return;

      const { data, error } = await supabase
        .from("diagnosis_codes")
        .select("id, code, title, chapter_roman, chapter_title, code_range, source")
        .eq("is_active", true)
        .eq("source", source)
        .in("id", valueIds);

      if (error) {
        console.warn("[DiagnosisSelector] init load error:", error);
        return;
      }

      const items: SelectedItem[] = (data ?? []).map((r: any) => ({
        id: r.id,
        label: `${r.code} - ${r.title}`,
        row: r as DiagnosisCodeRow,
      }));

      const ordered = valueIds
        .map((id) => items.find((x) => x.id === id))
        .filter(Boolean) as SelectedItem[];

      if (cancelled) return;
      setSelected(ordered);

      const p = ordered[0]?.id ?? null;
      setPrimaryId(p);

      (props as MultiProps).onChange(ordered);
      (props as MultiProps).onPrimaryChange?.(ordered[0] ?? null);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  // ✅ charger chapitres
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("diagnosis_codes")
        .select("chapter_title, chapter_roman")
        .eq("is_active", true)
        .eq("source", source)
        .not("chapter_title", "is", null);

      if (error) {
        console.warn("[DiagnosisSelector] chapters error:", error);
        return;
      }

      const uniq = new Map<string, { chapter_title: string; chapter_roman: string | null }>();
      (data ?? []).forEach((r: any) => {
        const key = String(r.chapter_title);
        if (!uniq.has(key)) uniq.set(key, { chapter_title: key, chapter_roman: r.chapter_roman ?? null });
      });

      const arr = Array.from(uniq.values()).sort((a, b) => {
        const ar = a.chapter_roman ?? "";
        const br = b.chapter_roman ?? "";
        if (ar && br && ar !== br) return ar.localeCompare(br, "fr");
        return a.chapter_title.localeCompare(b.chapter_title, "fr");
      });

      setChapters(arr);
    })();
  }, [source]);

  const debouncedQuery = useDebouncedValue(query, 250);

  // ✅ recherche
  useEffect(() => {
    const q = normalize(debouncedQuery);
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }

    (async () => {
      setLoading(true);

      const looksLikeCode =
        /^[A-Z]\d{2}(\.[a-z])?$/i.test(q) || /^[A-Z]\d{2}$/i.test(q);

      let builder = supabase
        .from("diagnosis_codes")
        .select("id, code, title, chapter_roman, chapter_title, code_range, source")
        .eq("is_active", true)
        .eq("source", source)
        .limit(20);

      if (looksLikeCode) {
        builder = builder.ilike("code", `${q.toUpperCase()}%`);
      } else {
        builder = builder.or(
          `title.ilike.%${escapeLike(q)}%,code.ilike.%${escapeLike(q)}%`
        );
      }

      const { data, error } = await builder;

      if (error) {
        console.warn("[DiagnosisSelector] search error:", error);
        setResults([]);
      } else {
        setResults((data ?? []) as DiagnosisCodeRow[]);
      }

      setLoading(false);
    })();
  }, [debouncedQuery, source]);

  const canClear = useMemo(() => {
    if (mode === "single") {
      const p = props as SingleProps;
      return !!p.valueId || !!p.valueText;
    }
    return selected.length > 0 || query.trim().length > 0;
  }, [mode, props, selected.length, query]);

  const emitSingle = (row: DiagnosisCodeRow | null) => {
    if (mode !== "single") return;
    (props as SingleProps).onSelect(row);
  };

  const emitMulti = (items: SelectedItem[]) => {
    if (mode !== "multi") return;
    (props as MultiProps).onChange(items);
  };

  const emitPrimary = (item: SelectedItem | null) => {
    if (mode !== "multi") return;
    (props as MultiProps).onPrimaryChange?.(item);
  };

  const addSelection = (r: DiagnosisCodeRow) => {
    if (mode === "single") {
      const txt = `${r.code} - ${r.title}`.trim();
      setQuery(txt);
      setResults([]);
      emitSingle(r);
      return;
    }

    const exists = selected.some((x) => x.id === r.id);
    if (exists) return;

    if (selected.length >= maxItems) {
      alert(`Maximum ${maxItems} affections pour le moment.`);
      return;
    }

    const item: SelectedItem = {
      id: r.id,
      label: `${r.code} - ${r.title}`,
      row: r,
    };

    const next = [...selected, item];
    setSelected(next);

    if (!primaryId) {
      setPrimaryId(item.id);
      emitPrimary(item);
    }

    emitMulti(next);

    // 🔥 vrai gain de temps: on nettoie direct la recherche
    setQuery("");
    setResults([]);
  };

  const removeSelection = (id: string) => {
    if (mode !== "multi") return;

    const next = selected.filter((x) => x.id !== id);
    setSelected(next);
    emitMulti(next);

    if (primaryId === id) {
      const newPrimary = next[0] ?? null;
      setPrimaryId(newPrimary?.id ?? null);
      emitPrimary(newPrimary);
    }
  };

  const setPrimary = (id: string) => {
    if (mode !== "multi") return;

    setPrimaryId(id);
    const p = selected.find((x) => x.id === id) ?? null;
    emitPrimary(p);
  };

  const loadChapter = async (chapterTitle: string) => {
    setActiveChapter(chapterTitle);
    setChapterLoading(true);

    const { data, error } = await supabase
      .from("diagnosis_codes")
      .select("id, code, title, chapter_roman, chapter_title, code_range, source")
      .eq("is_active", true)
      .eq("source", source)
      .eq("chapter_title", chapterTitle)
      .order("code", { ascending: true })
      .limit(400);

    if (error) {
      console.warn("[DiagnosisSelector] chapter load error:", error);
      setChapterRows([]);
    } else {
      setChapterRows((data ?? []) as DiagnosisCodeRow[]);
    }

    setChapterLoading(false);
  };

  const clearAll = () => {
    setQuery("");
    setResults([]);
    setChapterOpen(false);

    if (mode === "single") {
      emitSingle(null);
      return;
    }

    setSelected([]);
    setPrimaryId(null);
    emitMulti([]);
    emitPrimary(null);
  };

  return (
    <div className="space-y-2">
      {/* ✅ Sélection courante (multi) */}
      {mode === "multi" && selected.length > 0 && (
        <div className="border rounded-lg bg-white p-2">
          <div className="text-sm font-semibold mb-2">Affections sélectionnées</div>

          <div className="space-y-2">
            {selected.map((it) => {
              const isPrimary = it.id === primaryId;
              return (
                <div key={it.id} className="flex items-center justify-between gap-2 border rounded p-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="primary-diagnosis"
                      checked={isPrimary}
                      onChange={() => setPrimary(it.id)}
                      disabled={disabled}
                      title="Définir comme diagnostic principal"
                    />
                    <div>
                      <div className="text-sm font-medium">
                        {it.row.code} — {it.row.title}
                        {isPrimary && (
                          <span className="ml-2 text-xs text-green-700 font-semibold">
                            (Principal)
                          </span>
                        )}
                      </div>
                      {it.row.chapter_title && (
                        <div className="text-xs text-gray-500">
                          {it.row.chapter_roman ? `${it.row.chapter_roman} — ` : ""}
                          {it.row.chapter_title}
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeSelection(it.id)}
                    className="bg-white text-red-700 border border-red-200 hover:bg-red-50"
                  >
                    Retirer
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ✅ Barre de recherche */}
      <div className="flex items-center gap-2">
        <Input
          disabled={disabled}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Recherche affection (ex: palu, septicémie, A01...)"
        />

        <Button
          type="button"
          disabled={disabled}
          onClick={() => setChapterOpen((v) => !v)}
          className="bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
        >
          Chapitres
        </Button>

        <Button
          type="button"
          disabled={disabled || !canClear}
          onClick={clearAll}
          className="bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
        >
          {mode === "multi" ? "Tout effacer" : "Effacer"}
        </Button>
      </div>

      {/* ✅ Résultats recherche */}
      {loading && <div className="text-sm text-gray-500">Recherche…</div>}

      {!loading && results.length > 0 && (
        <div className="border rounded-lg bg-white overflow-hidden">
          {results.map((r) => (
            <button
              type="button"
              key={r.id}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 disabled:opacity-50"
              onClick={() => addSelection(r)}
              disabled={disabled}
            >
              <div className="font-medium">
                {r.code} — {r.title}
              </div>
              {r.chapter_title && (
                <div className="text-xs text-gray-500">
                  {r.chapter_roman ? `${r.chapter_roman} — ` : ""}
                  {r.chapter_title}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ✅ Mode chapitres */}
      {chapterOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border rounded-lg bg-white p-2">
            <div className="text-sm font-semibold mb-2">Chapitres</div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {chapters.map((c) => (
                <button
                  key={c.chapter_title}
                  type="button"
                  className={`w-full text-left px-2 py-2 rounded hover:bg-gray-50 ${
                    activeChapter === c.chapter_title ? "bg-gray-50" : ""
                  }`}
                  onClick={() => loadChapter(c.chapter_title)}
                  disabled={disabled}
                >
                  <div className="text-sm font-medium">
                    {c.chapter_roman ? `${c.chapter_roman} — ` : ""}
                    {c.chapter_title}
                  </div>
                </button>
              ))}
              {chapters.length === 0 && (
                <div className="text-sm text-gray-500 p-2">Aucun chapitre trouvé.</div>
              )}
            </div>
          </div>

          <div className="border rounded-lg bg-white p-2">
            <div className="text-sm font-semibold mb-2">
              {activeChapter ? `Codes — ${activeChapter}` : "Sélectionne un chapitre"}
            </div>

            {chapterLoading && <div className="text-sm text-gray-500">Chargement…</div>}

            {!chapterLoading && activeChapter && (
              <div className="max-h-64 overflow-y-auto">
                {chapterRows.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="w-full text-left px-2 py-2 hover:bg-gray-50 border-b last:border-b-0 disabled:opacity-50"
                    onClick={() => addSelection(r)}
                    disabled={disabled}
                  >
                    <div className="text-sm font-medium">
                      {r.code} — {r.title}
                    </div>
                  </button>
                ))}
                {chapterRows.length === 0 && (
                  <div className="text-sm text-gray-500 p-2">Aucun code dans ce chapitre.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500">
        💡 Astuce : tape “palu”, “typho”, “VIH”, ou un code (“A01”).{" "}
        {mode === "multi" ? <>Tu peux sélectionner jusqu’à {maxItems} affections.</> : null}
      </div>
    </div>
  );
}
