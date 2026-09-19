// src/Pages/pharmacy/PharmacyDashboard.tsx
//
// Écran principal de l'espace pharmacie : recherche d'une ordonnance par son
// code de retrait. Le champ est pensé pour une douchette code-barres/QR déjà
// présente au comptoir (elle "tape" le code puis Entrée, comme pour un
// médicament) — la saisie manuelle reste le repli si la pharmacie n'en a
// pas. Le patient peut se présenter dans n'importe quelle pharmacie du
// réseau, papier en main, sans que le médecin ait dû en désigner une.
import { FormEvent, useRef, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePharmacyContext } from "../../hooks/usePharmacyContext";

type LookupResult = {
  consultation_id: string;
  created_at: string;
  patient_name: string | null;
  doctor_name: string | null;
  clinic_name: string | null;
  medications: string[];
  already_delivered: boolean;
  delivered_items: string[];
};

export default function PharmacyDashboard() {
  const { ctx, loading: ctxLoading } = usePharmacyContext();
  const [code, setCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetResult = () => {
    setResult(null);
    setChecked({});
    setComment("");
    setConfirmation(null);
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setSearching(true);
    setSearchError(null);
    resetResult();

    const { data, error } = await supabase
      .rpc("pharmacy_lookup_by_code", { p_code: code.trim() })
      .maybeSingle();

    setSearching(false);

    if (error) {
      console.error("[PharmacyDashboard] lookup error:", error);
      setSearchError("Erreur lors de la recherche.");
      return;
    }

    if (!data) {
      setSearchError("Aucune ordonnance validée ne correspond à ce code.");
      return;
    }

    const lookup = data as LookupResult;
    setResult(lookup);
    const initialChecked: Record<number, boolean> = {};
    lookup.medications.forEach((_, i) => {
      initialChecked[i] = true;
    });
    setChecked(initialChecked);
  };

  const handleDeliver = async () => {
    if (!result) return;

    const delivered_items = result.medications.filter((_, i) => checked[i]);
    if (delivered_items.length === 0) {
      alert("Cochez au moins un médicament réellement remis, ou annulez.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.rpc("pharmacy_record_delivery", {
      p_consultation_id: result.consultation_id,
      p_delivered_items: delivered_items,
      p_comment: comment.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      console.error("[PharmacyDashboard] delivery error:", error);
      alert(error.message || "Erreur lors de l'enregistrement de la délivrance.");
      return;
    }

    setConfirmation(
      delivered_items.length === result.medications.length
        ? "✅ Ordonnance délivrée intégralement."
        : `✅ Délivrance partielle enregistrée (${delivered_items.length}/${result.medications.length} lignes).`
    );
    setResult(null);
    setCode("");
    inputRef.current?.focus();
  };

  if (ctxLoading) return <p>Chargement…</p>;
  if (!ctx) return <p>Session pharmacien introuvable.</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">🔎 Rechercher une ordonnance</h1>
      <p className="text-sm text-gray-500 mb-4">
        Saisissez ou scannez le code de retrait imprimé sur l'ordonnance du patient.
      </p>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          ref={inputRef}
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Ex. 3F2A9B7CD1"
          className="flex-1 border rounded px-4 py-3 text-lg tracking-widest uppercase"
        />
        <button
          type="submit"
          disabled={searching}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {searching ? "Recherche…" : "Rechercher"}
        </button>
      </form>

      {confirmation && (
        <div className="mb-4 rounded bg-green-50 border border-green-200 text-green-800 px-4 py-3">
          {confirmation}
        </div>
      )}

      {searchError && (
        <div className="mb-4 rounded bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3">
          {searchError}
        </div>
      )}

      {result && (
        <div className="border rounded-xl p-4 bg-gray-50 shadow-sm space-y-3">
          <p><strong>🧍 Patient :</strong> {result.patient_name || "—"}</p>
          <p><strong>👨‍⚕️ Médecin :</strong> {result.doctor_name || "—"}</p>
          <p><strong>🏥 Établissement :</strong> {result.clinic_name || "—"}</p>
          <p><strong>📅 Date :</strong> {new Date(result.created_at).toLocaleString()}</p>

          {result.already_delivered ? (
            <div className="rounded bg-red-50 border border-red-200 text-red-800 px-3 py-2 text-sm">
              ⚠️ Cette ordonnance a déjà été délivrée
              {result.delivered_items.length > 0 && (
                <> ({result.delivered_items.join(", ")})</>
              )}
              .
            </div>
          ) : (
            <>
              <div>
                <p className="font-medium mb-1">Médicaments prescrits — cochez ce qui est réellement remis :</p>
                <ul className="space-y-1">
                  {result.medications.length === 0 && (
                    <li className="text-gray-500 italic">Aucun médicament renseigné.</li>
                  )}
                  {result.medications.map((med, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!checked[i]}
                        onChange={(e) =>
                          setChecked((prev) => ({ ...prev, [i]: e.target.checked }))
                        }
                      />
                      <span>{med}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Commentaire (rupture de stock, substitution…) — facultatif
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>

              <button
                onClick={handleDeliver}
                disabled={submitting || result.medications.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? "Enregistrement…" : "✅ Valider la délivrance"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
