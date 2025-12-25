//src/components/ui/uidoctor/ActSelector.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Input } from "../input";
import { Button } from "../button";

export type ActCodeRow = {
  id: string;
  code: string;
  title: string;
  title_group: string | null;
  chapter_roman: string | null;
  chapter_title: string | null;
  article_no: string | null;
  key_letter: string | null;
  coefficient: number | null;
  profession_scope: string | null;
  source: string;
  is_active: boolean;
};

export type SelectedAct = {
  act_id: string; // id dans act_codes
  code: string;
  title: string;
  key_letter: string | null;
  coefficient: number | null;
  profession_scope: string | null;
  source: string | null;
  label: string; // "MAL F00010 — Clavicule..."
};

type Props = {
  value: SelectedAct[];
  onChange: (acts: SelectedAct[]) => void;

  source?: string;
  professionScope?: string; // ex "physician"
  maxItems?: number;
  disabled?: boolean;
};

function escapeLike(s: string) {
  return s.replace(/[%_]/g, "\\$&");
}

function normalize(s: string) {
  return s.trim();
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export default function ActSelector({
  value,
  onChange,
  source = "ACTES-CNAMGS-2012",
  professionScope,
  maxItems = 10,
  disabled = false,
}: Props) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);

  const [results, setResults] = useState<ActCodeRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Chapitres
  const [chapterOpen, setChapterOpen] = useState(false);
  const [chapters, setChapters] = useState<
    { title_group: string | null; chapter_roman: string | null; chapter_title: string }[]
  >([]);
  const [activeChapterKey, setActiveChapterKey] = useState<string | null>(null);
  const [chapterRows, setChapterRows] = useState<ActCodeRow[]>([]);
  const [chapterLoading, setChapterLoading] = useState(false);

  const canClear = useMemo(() => (value?.length ?? 0) > 0, [value]);

  const addAct = (r: ActCodeRow) => {
    if (value.some((a) => a.act_id === r.id)) return;
    if (value.length >= maxItems) {
      alert(`Maximum ${maxItems} actes pour le moment.`);
      return;
    }

    const item: SelectedAct = {
      act_id: r.id,
      code: r.code,
      title: r.title,
      key_letter: r.key_letter ?? null,
      coefficient: r.coefficient ?? null,
      profession_scope: r.profession_scope ?? null,
      source: r.source ?? null,
      label: `${r.code} — ${r.title}`,
    };

    onChange([...value, item]);
    setQuery("");
    setResults([]);
  };

  const removeAct = (act_id: string) => {
    onChange(value.filter((a) => a.act_id !== act_id));
  };

  // Charger chapitres
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("act_codes")
        .select("title_group, chapter_roman, chapter_title")
        .eq("is_active", true)
        .eq("source", source)
        .not("chapter_title", "is", null);

      if (error) {
        console.warn("[ActSelector] chapters error:", error);
        return;
      }

      const uniq = new Map<string, { title_group: string | null; chapter_roman: string | null; chapter_title: string }>();
      (data ?? []).forEach((r: any) => {
        const key = `${r.title_group ?? ""}||${r.chapter_roman ?? ""}||${r.chapter_title}`;
        if (!uniq.has(key)) {
          uniq.set(key, {
            title_group: r.title_group ?? null,
            chapter_roman: r.chapter_roman ?? null,
            chapter_title: String(r.chapter_title),
          });
        }
      });

      const arr = Array.from(uniq.values()).sort((a, b) => {
        const ag = a.title_group ?? "";
        const bg = b.title_group ?? "";
        if (ag !== bg) return ag.localeCompare(bg, "fr");
        const ar = a.chapter_roman ?? "";
        const br = b.chapter_roman ?? "";
        if (ar !== br) return ar.localeCompare(br, "fr");
        return a.chapter_title.localeCompare(b.chapter_title, "fr");
      });

      setChapters(arr);
    })();
  }, [source]);

  // Recherche
  useEffect(() => {
    const q = normalize(debouncedQuery);
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }

    (async () => {
      setLoading(true);

      const looksLikeCode = /^[A-Z]{2,5}\s?[A-Z]?\d{3,6}(-\d+)?$/i.test(q); // ex: "MAL F00010", "BHE C002619", "ART5-2"

      let builder = supabase
        .from("act_codes")
        .select(
          "id, code, title, title_group, chapter_roman, chapter_title, article_no, key_letter, coefficient, profession_scope, source, is_active"
        )
        .eq("is_active", true)
        .eq("source", source)
        .limit(30);

      // Filtre professionScope robuste
      if (professionScope?.trim()) {
        builder = builder.ilike("profession_scope", professionScope.trim());
      }

      if (looksLikeCode) {
        // tolérer avec ou sans espaces
        const qNoSpace = q.replace(/\s+/g, "");
        builder = builder.or(
          `code.ilike.%${escapeLike(q)}%,code.ilike.%${escapeLike(qNoSpace)}%`
        );
      } else {
        builder = builder.or(
          `title.ilike.%${escapeLike(q)}%,code.ilike.%${escapeLike(q)}%`
        );
      }

      const { data, error } = await builder;

      if (error) {
        console.warn("[ActSelector] search error:", error);
        setResults([]);
      } else {
        setResults((data ?? []) as ActCodeRow[]);
      }

      setLoading(false);
    })();
  }, [debouncedQuery, source, professionScope]);

  const loadChapter = async (c: { title_group: string | null; chapter_roman: string | null; chapter_title: string }) => {
    const key = `${c.title_group ?? ""}||${c.chapter_roman ?? ""}||${c.chapter_title}`;
    setActiveChapterKey(key);
    setChapterLoading(true);

    let builder = supabase
      .from("act_codes")
      .select(
        "id, code, title, title_group, chapter_roman, chapter_title, article_no, key_letter, coefficient, profession_scope, source, is_active"
      )
      .eq("is_active", true)
      .eq("source", source)
      .eq("chapter_title", c.chapter_title)
      .order("code", { ascending: true })
      .limit(400);

    if (c.title_group) builder = builder.eq("title_group", c.title_group);
    if (c.chapter_roman) builder = builder.eq("chapter_roman", c.chapter_roman);
    if (professionScope?.trim()) builder = builder.ilike("profession_scope", professionScope.trim());

    const { data, error } = await builder;

    if (error) {
      console.warn("[ActSelector] chapter load error:", error);
      setChapterRows([]);
    } else {
      setChapterRows((data ?? []) as ActCodeRow[]);
    }

    setChapterLoading(false);
  };

  return (
    <div className="space-y-2">
      {/* sélection */}
      {value.length > 0 && (
        <div className="border rounded-lg bg-white p-2">
          <div className="text-sm font-semibold mb-2">Actes sélectionnés</div>
          <div className="space-y-2">
            {value.map((a) => (
              <div key={a.act_id} className="flex items-center justify-between gap-2 border rounded p-2">
                <div className="text-sm">
                  <div className="font-medium">{a.code} — {a.title}</div>
                  <div className="text-xs text-gray-500">
                    {a.key_letter ? `Lettre-clé: ${a.key_letter}` : "Lettre-clé: —"}{" "}
                    {a.coefficient != null ? `• Coef: ${a.coefficient}` : ""}{" "}
                    {a.profession_scope ? `• ${a.profession_scope}` : ""}
                  </div>
                </div>
                <Button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeAct(a.act_id)}
                  className="bg-white text-red-700 border border-red-200 hover:bg-red-50"
                >
                  Retirer
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* barre */}
      <div className="flex items-center gap-2">
        <Input
          disabled={disabled}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Recherche acte (ex: fracture, clavicule, MAL F00010...)"
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
          onClick={() => onChange([])}
          className="bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
        >
          Tout effacer
        </Button>
      </div>

      {/* résultats */}
      {loading && <div className="text-sm text-gray-500">Recherche…</div>}

      {!loading && results.length > 0 && (
        <div className="border rounded-lg bg-white overflow-hidden">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              disabled={disabled}
              onClick={() => addAct(r)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
            >
              <div className="font-medium">{r.code} — {r.title}</div>
              <div className="text-xs text-gray-500">
                {r.key_letter ? `Lettre-clé: ${r.key_letter}` : "Lettre-clé: —"}
                {r.coefficient != null ? ` • Coef: ${r.coefficient}` : ""}
                {r.chapter_title ? ` • ${r.chapter_title}` : ""}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* chapitres */}
      {chapterOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="border rounded-lg bg-white p-2">
            <div className="text-sm font-semibold mb-2">Chapitres</div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {chapters.map((c) => {
                const key = `${c.title_group ?? ""}||${c.chapter_roman ?? ""}||${c.chapter_title}`;
                const active = activeChapterKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={disabled}
                    onClick={() => loadChapter(c)}
                    className={`w-full text-left px-2 py-2 rounded hover:bg-gray-50 ${active ? "bg-gray-50" : ""}`}
                  >
                    <div className="text-xs text-gray-500">{c.title_group ?? ""}</div>
                    <div className="text-sm font-medium">
                      {c.chapter_roman ? `${c.chapter_roman} — ` : ""}
                      {c.chapter_title}
                    </div>
                  </button>
                );
              })}
              {chapters.length === 0 && (
                <div className="text-sm text-gray-500 p-2">Aucun chapitre trouvé.</div>
              )}
            </div>
          </div>

          <div className="border rounded-lg bg-white p-2">
            <div className="text-sm font-semibold mb-2">Codes</div>
            {chapterLoading && <div className="text-sm text-gray-500">Chargement…</div>}
            {!chapterLoading && (
              <div className="max-h-64 overflow-y-auto">
                {chapterRows.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => addAct(r)}
                    className="w-full text-left px-2 py-2 hover:bg-gray-50 border-b last:border-b-0"
                  >
                    <div className="text-sm font-medium">{r.code} — {r.title}</div>
                  </button>
                ))}
                {chapterRows.length === 0 && (
                  <div className="text-sm text-gray-500 p-2">Aucun acte dans ce chapitre.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500">
        💡 Astuce : tu peux taper le code (“MAL F00010”) ou des mots (“fracture”, “clavicule”). Max {maxItems}.
      </div>
    </div>
  );
}
