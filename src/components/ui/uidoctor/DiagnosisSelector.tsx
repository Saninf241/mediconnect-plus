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

type Props = {
  valueId?: string | null;
  valueText?: string | null;
  source?: string; // ex: "ICD10-CNAMGS-2012"
  disabled?: boolean;

  onSelect: (row: DiagnosisCodeRow | null) => void;
};

function normalize(s: string) {
  return s.trim();
}

export default function DiagnosisSelector({
  valueId = null,
  valueText = null,
  source = "ICD10-CNAMGS-2012",
  disabled = false,
  onSelect,
}: Props) {
  const [query, setQuery] = useState<string>(valueText ?? "");
  const [results, setResults] = useState<DiagnosisCodeRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Mode “par chapitres”
  const [chapters, setChapters] = useState<
    { chapter_title: string; chapter_roman: string | null }[]
  >([]);
  const [chapterOpen, setChapterOpen] = useState(false);
  const [activeChapter, setActiveChapter] = useState<string | null>(null);
  const [chapterRows, setChapterRows] = useState<DiagnosisCodeRow[]>([]);
  const [chapterLoading, setChapterLoading] = useState(false);

  // Garde query synchro quand parent change
  useEffect(() => {
    if (valueText != null && valueText !== query) {
      setQuery(valueText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueText]);

  // Charge les chapitres (une fois)
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

      // dédoublonnage
      const uniq = new Map<string, { chapter_title: string; chapter_roman: string | null }>();
      (data ?? []).forEach((r: any) => {
        const key = String(r.chapter_title);
        if (!uniq.has(key)) uniq.set(key, { chapter_title: key, chapter_roman: r.chapter_roman ?? null });
      });

      // tri : roman (I, II...) puis alpha fallback
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

  // Recherche “intelligente” (code OU titre)
  useEffect(() => {
    const q = normalize(debouncedQuery);
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }

    (async () => {
      setLoading(true);

      // Si l’utilisateur tape un code (A01 / C02.a)
      const looksLikeCode = /^[A-Z]\d{2}(\.[a-z])?$/i.test(q) || /^[A-Z]\d{2}$/i.test(q);

      let builder = supabase
        .from("diagnosis_codes")
        .select("id, code, title, chapter_roman, chapter_title, code_range, source")
        .eq("is_active", true)
        .eq("source", source)
        .limit(20);

      if (looksLikeCode) {
        builder = builder.ilike("code", `${q.toUpperCase()}%`);
      } else {
        // recherche sur title + fallback sur code (si q contient A0 etc)
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

  // Charge les codes d’un chapitre
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

  const canClear = useMemo(() => !!valueId || !!valueText, [valueId, valueText]);

  return (
    <div className="space-y-2">
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
        onClick={() => {
            setQuery("");
            setResults([]);
            onSelect(null);
        }}
        className="bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
        >
        Effacer
        </Button>
      </div>

      {/* Résultats recherche */}
      {loading && (
        <div className="text-sm text-gray-500">Recherche…</div>
      )}

      {!loading && results.length > 0 && (
        <div className="border rounded-lg bg-white overflow-hidden">
          {results.map((r) => (
            <button
              type="button"
              key={r.id}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
              onClick={() => {
                const text = `${r.code} - ${r.title}`;
                setQuery(text);
                setResults([]);
                onSelect(r);
              }}
            >
              <div className="font-medium">{r.code} — {r.title}</div>
              {r.chapter_title && (
                <div className="text-xs text-gray-500">
                  {r.chapter_roman ? `${r.chapter_roman} — ` : ""}{r.chapter_title}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Mode chapitres */}
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
                >
                  <div className="text-sm font-medium">
                    {c.chapter_roman ? `${c.chapter_roman} — ` : ""}{c.chapter_title}
                  </div>
                </button>
              ))}
              {chapters.length === 0 && (
                <div className="text-sm text-gray-500 p-2">
                  Aucun chapitre trouvé.
                </div>
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
                    className="w-full text-left px-2 py-2 hover:bg-gray-50 border-b last:border-b-0"
                    onClick={() => {
                      const text = `${r.code} - ${r.title}`;
                      setQuery(text);
                      onSelect(r);
                      setChapterOpen(false);
                      setActiveChapter(null);
                      setChapterRows([]);
                    }}
                  >
                    <div className="text-sm font-medium">{r.code} — {r.title}</div>
                  </button>
                ))}
                {chapterRows.length === 0 && (
                  <div className="text-sm text-gray-500 p-2">
                    Aucun code dans ce chapitre.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Valeur sélectionnée */}
      {valueId && valueText && (
        <div className="text-xs text-gray-600">
          ✅ Sélection : <span className="font-medium">{valueText}</span>
        </div>
      )}
    </div>
  );
}

/** Debounce hook */
function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/** échappe % _ pour LIKE */
function escapeLike(s: string) {
  return s.replace(/[%_]/g, "\\$&");
}
