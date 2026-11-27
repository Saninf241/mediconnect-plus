// src/Pages/developer/MergePatientsPage.tsx
// Interface pour merge_patients() (supabase/migrations/20260712130000_merge_patients.sql,
// reparee et testee) -- jusqu'ici accessible uniquement depuis l'editeur SQL.
// Cherche des patients candidats doublons, permet de choisir lequel garder
// (survivor) et lequel fusionner dedans (loser), puis appelle la fonction.
// Bouton "Editer" : filet de secours pour corriger une fiche (nom/telephone/
// date de naissance/NIN) quand aucun staff actif du cabinet ne peut le faire
// lui-meme -- pas un doublon du modal secretaire (scope clinic_id + RLS),
// chaque edition passe par dev-manage-patients (update_patient) et est
// journalisee dans dev_patient_edits.
import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

const FUNCTIONS_BASE =
  (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/+$/, "") +
  "/functions/v1";

type Patient = {
  id: string;
  name: string;
  phone: string | null;
  national_id: string | null;
  date_of_birth: string | null;
  is_assured: boolean | null;
  fingerprint_enrolled: boolean | null;
  status: string | null;
  merged_into_patient_id: string | null;
  clinic_id: string | null;
  clinics: { name: string } | null;
};

export default function MergePatientsPage() {
  const { getToken } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);

  const [survivor, setSurvivor] = useState<Patient | null>(null);
  const [loser, setLoser] = useState<Patient | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [merging, setMerging] = useState(false);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);

  const [editing, setEditing] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", date_of_birth: "", national_id: "" });
  const [unlockName, setUnlockName] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function call(body: unknown) {
    const token = await getToken();
    const res = await fetch(`${FUNCTIONS_BASE}/dev-manage-patients`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Erreur");
    return data;
  }

  async function search() {
    if (query.trim().length < 2) {
      toast.error("Au moins 2 caractères.");
      return;
    }
    setSearching(true);
    try {
      const data = await call({ action: "search_patients", query: query.trim() });
      setResults(data.patients ?? []);
    } catch (err: any) {
      toast.error(err.message || "Échec de la recherche");
    } finally {
      setSearching(false);
    }
  }

  async function doMerge() {
    if (!survivor || !loser) return;
    setMerging(true);
    try {
      const data = await call({ action: "merge_patients", survivor_id: survivor.id, loser_id: loser.id });
      setSummary(data.summary ?? null);
      toast.success("Fusion effectuée.");
      setConfirming(false);
      setSurvivor(null);
      setLoser(null);
      setResults([]);
      setQuery("");
    } catch (err: any) {
      toast.error(err.message || "Échec de la fusion");
    } finally {
      setMerging(false);
    }
  }

  function openEdit(p: Patient) {
    setEditing(p);
    setEditForm({
      name: p.name,
      phone: p.phone ?? "",
      date_of_birth: p.date_of_birth ?? "",
      national_id: p.national_id ?? "",
    });
    setUnlockName(false);
    setEditReason("");
  }

  const nameLocked = !!editing && (!!editing.is_assured || !!editing.fingerprint_enrolled) && !unlockName;

  async function saveEdit() {
    if (!editing) return;
    if (!editForm.date_of_birth) {
      toast.error("La date de naissance ne peut pas être vide.");
      return;
    }
    if (unlockName && editForm.name.trim() !== editing.name && !editReason.trim()) {
      toast.error("Un motif est requis pour changer le nom d'un patient assuré/identifié.");
      return;
    }
    setSaving(true);
    try {
      const updates: Record<string, string | null> = {
        phone: editForm.phone.trim() || null,
        date_of_birth: editForm.date_of_birth,
        national_id: editForm.national_id.trim() || null,
      };
      if (!nameLocked) updates.name = editForm.name.trim();

      const data = await call({
        action: "update_patient",
        patient_id: editing.id,
        updates,
        reason: editReason.trim() || undefined,
      });
      if ((data.changed ?? []).length === 0) {
        toast.info("Aucune modification.");
      } else {
        toast.success(`Fiche mise à jour (${data.changed.join(", ")}).`);
      }
      setEditing(null);
      setResults([]);
      setQuery("");
    } catch (err: any) {
      toast.error(err.message || "Échec de la mise à jour");
    } finally {
      setSaving(false);
    }
  }

  function describe(p: Patient) {
    return `${p.name} · ${p.phone ?? "—"} · NIN ${p.national_id ?? "—"} · ${
      p.clinics?.name ?? "—"
    } · ${p.is_assured ? "Assuré" : "Non assuré"}${p.status === "merged" ? " · DÉJÀ FUSIONNÉ" : ""}`;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fusionner des patients dupliqués</h1>
        <p className="text-gray-600">
          Cherche un patient, désigne le dossier à conserver et le doublon à fusionner dedans.
          Le doublon n'est jamais supprimé physiquement — il est marqué "merged" et redirigé.
          Irréversible.
        </p>
      </div>

      <Card className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Nom, téléphone ou NIN…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <Button onClick={search} disabled={searching}>
            {searching ? "…" : "Chercher"}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {results.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b py-2 text-sm">
                <span className={p.status === "merged" ? "text-gray-400" : ""}>{describe(p)}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSurvivor(p)}
                    disabled={p.status === "merged"}
                    className="text-emerald-700 text-xs hover:underline disabled:opacity-40"
                  >
                    Garder
                  </button>
                  <button
                    onClick={() => setLoser(p)}
                    disabled={p.status === "merged"}
                    className="text-orange-700 text-xs hover:underline disabled:opacity-40"
                  >
                    Fusionner (doublon)
                  </button>
                  <button
                    onClick={() => openEdit(p)}
                    disabled={p.status === "merged"}
                    className="text-blue-700 text-xs hover:underline disabled:opacity-40"
                  >
                    Éditer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="space-y-2">
          <h3 className="font-semibold text-emerald-700">Dossier conservé</h3>
          {survivor ? (
            <p className="text-sm">{describe(survivor)}</p>
          ) : (
            <p className="text-sm text-gray-400">Aucun choisi.</p>
          )}
        </Card>
        <Card className="space-y-2">
          <h3 className="font-semibold text-orange-700">Doublon (sera fusionné)</h3>
          {loser ? (
            <p className="text-sm">{describe(loser)}</p>
          ) : (
            <p className="text-sm text-gray-400">Aucun choisi.</p>
          )}
        </Card>
      </div>

      {survivor && loser && (
        <Button onClick={() => setConfirming(true)} className="bg-orange-600 hover:bg-orange-700">
          Fusionner ces deux dossiers
        </Button>
      )}

      {summary && (
        <Card className="space-y-2 border-emerald-300 bg-emerald-50">
          <h3 className="font-semibold text-emerald-900">Fusion effectuée</h3>
          <pre className="text-xs text-emerald-900 whitespace-pre-wrap">
            {JSON.stringify(summary, null, 2)}
          </pre>
        </Card>
      )}

      {confirming && survivor && loser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="max-w-md w-full space-y-3">
            <h3 className="font-semibold text-lg text-orange-700">Confirmer la fusion</h3>
            <p className="text-sm text-gray-700">
              <b>{loser.name}</b> sera fusionné dans <b>{survivor.name}</b> : toutes ses
              consultations, ordonnances, adhésions assureur, etc. seront rattachées au dossier
              conservé. Le dossier "{loser.name}" restera visible comme référence fusionnée, mais
              ne sera plus utilisable seul. Irréversible.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setConfirming(false)}
                className="px-4 py-2 text-sm rounded border"
              >
                Annuler
              </button>
              <Button onClick={doMerge} disabled={merging} className="bg-orange-600 hover:bg-orange-700">
                {merging ? "Fusion…" : "Confirmer la fusion"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="max-w-md w-full space-y-3">
            <h3 className="font-semibold text-lg text-blue-700">Corriger la fiche</h3>
            <p className="text-xs text-gray-500">
              Filet de secours quand aucun staff actif du cabinet ne peut corriger le dossier
              lui-même (cabinet fermé, staff parti). Chaque modification est journalisée.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Nom</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                disabled={nameLocked}
              />
              {!!editing && (editing.is_assured || editing.fingerprint_enrolled) && (
                <label className="flex items-center gap-2 text-xs text-orange-700 pt-1">
                  <input
                    type="checkbox"
                    checked={unlockName}
                    onChange={(e) => setUnlockName(e.target.checked)}
                  />
                  Patient assuré/identifié par empreinte — déverrouiller le nom (motif requis)
                </label>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Téléphone</label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Date de naissance</label>
              <Input
                type="date"
                value={editForm.date_of_birth}
                onChange={(e) => setEditForm((f) => ({ ...f, date_of_birth: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">NIN</label>
              <Input
                value={editForm.national_id}
                onChange={(e) => setEditForm((f) => ({ ...f, national_id: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">
                Motif {unlockName ? "(obligatoire — déverrouillage du nom)" : "(optionnel)"}
              </label>
              <Input
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Ex : cabinet fermé, correction demandée par le patient…"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-sm rounded border"
              >
                Annuler
              </button>
              <Button onClick={saveEdit} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
