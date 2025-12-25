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
  source: string;
  profession_scope: string | null;
  is_active: boolean;
};

export type SelectedAct = {
  act_id: string;
  code: string;
  title: string;
  key_letter: string | null;
  coefficient: number | null;
  profession_scope?: string | null;
  source?: string | null;
};

type Props = {
  value?: SelectedAct[];
  onChange: (next: SelectedAct[]) => void;

  source?: string;              // default "ACTES-CNAMGS-2012"
  professionScope?: string;      // default "physician"
  disabled?: boolean;
  maxItems?: number;
};

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

export default function ActSelector({
  value = [],
  onChange,
  source = "ACTES-CNAMGS-2012",
  professionScope = "physician",
  disabled = false,
  maxItems = 10,
}: Props) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);

  const [results, setResults] = useState<ActCodeRow[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedIds = useMemo(() => new Set(value.map(v => v.act_id)), [value]);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }

    (async () => {
      setLoading(true);

      let builder = supabase
        .from("act_codes")
        .select("id,code,title,title_group,chapter_roman,chapter_title,article_no,key_letter,coefficient,source,profession_scope,is_active")
        .eq("is_active", true)
        .eq("source", source)
        .eq("profession_scope", professionScope)
        .limit(25);

      const looksLikeCode = /^[A-Z]{2,5}\s?[A-Z]?\d/i.test(q) || /^[A-Z]{1,4}\s?\d/i.test(q);

      if (looksLikeCode) {
        builder = builder.ilike("code", `${q.toUpperCase()}%`);
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

  const addAct = (r: ActCodeRow) => {
    if (disabled) return;
    if (selectedIds.has(r.id)) return;

    if (value.length >= maxItems) {
      alert(`Maximum ${maxItems} actes pour le moment.`);
      return;
    }

    const next: SelectedAct[] = [
      ...value,
      {
        act_id: r.id,
        code: r.code,
        title: r.title,
        key_letter: r.key_letter,
        coefficient: r.coefficient,
        profession_scope: r.profession_scope,
        source: r.source,
      },
    ];

    onChange(next);
    setQuery("");
    setResults([]);
  };

  const removeAct = (act_id: string) => {
    const next = value.filter(v => v.act_id !== act_id);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {/* sélection courante */}
      {value.length > 0 && (
        <div className="border rounded-lg bg-white p-2">
          <div className="text-sm font-semibold mb-2">Actes sélectionnés</div>
          <div className="space-y-2">
            {value.map((it) => (
              <div key={it.act_id} className="flex items-center justify-between gap-2 border rounded p-2">
                <div>
                  <div className="text-sm font-medium">
                    {it.code} — {it.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    Lettre clé: {it.key_letter ?? "—"} • Coef: {it.coefficient ?? "—"}
                  </div>
                </div>
                <Button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeAct(it.act_id)}
                  className="bg-white text-red-700 border border-red-200 hover:bg-red-50"
                >
                  Retirer
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* recherche */}
      <div className="flex items-center gap-2">
        <Input
          disabled={disabled}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Recherche acte (ex: fracture, clavicule, MAL F00010...)"
        />
        <Button
          type="button"
          disabled={disabled || value.length === 0}
          onClick={() => onChange([])}
          className="bg-white text-gray-900 border border-gray-300 hover:bg-gray-50"
        >
          Tout effacer
        </Button>
      </div>

      {loading && <div className="text-sm text-gray-500">Recherche…</div>}

      {!loading && results.length > 0 && (
        <div className="border rounded-lg bg-white overflow-hidden">
          {results.map((r) => (
            <button
              type="button"
              key={r.id}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0 disabled:opacity-50"
              onClick={() => addAct(r)}
              disabled={disabled || selectedIds.has(r.id)}
            >
              <div className="font-medium">
                {r.code} — {r.title}
              </div>
              <div className="text-xs text-gray-500">
                {r.key_letter ?? "—"} • coef {r.coefficient ?? "—"}
                {r.chapter_title ? ` • ${r.chapter_title}` : ""}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-500">
        💡 Astuce : tu peux taper le code (“MAL F00010”) ou des mots (“fracture”, “clavicule”). Max {maxItems}.
      </div>
    </div>
  );
}
