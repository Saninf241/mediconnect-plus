// src/Pages/developer/ManageOrgsPage.tsx
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

const FUNCTIONS_BASE =
  (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/+$/, "") +
  "/functions/v1";

type Clinic = {
  id: string;
  name: string;
  type: string | null;
  active: boolean | null;
  created_at: string;
  clinic_staff: { count: number }[];
  consultations: { count: number }[];
};

type Insurer = {
  id: string;
  name: string;
  verification_level: string | null;
  insurer_staff: { count: number }[];
};

export default function ManageOrgsPage() {
  const { getToken } = useAuth();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmTarget, setConfirmTarget] = useState<
    { kind: "clinic" | "insurer"; id: string; name: string } | null
  >(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function call(body: unknown) {
    const token = await getToken();
    const res = await fetch(`${FUNCTIONS_BASE}/dev-manage-orgs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Erreur");
    return data;
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [c, i] = await Promise.all([
        call({ action: "list_clinics" }),
        call({ action: "list_insurers" }),
      ]);
      setClinics(c.clinics ?? []);
      setInsurers(i.insurers ?? []);
    } catch (err: any) {
      toast.error(err.message || "Impossible de charger la liste");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmDelete() {
    if (!confirmTarget || confirmText.trim() !== confirmTarget.name) return;
    setDeleting(true);
    try {
      if (confirmTarget.kind === "clinic") {
        await call({ action: "delete_clinic", clinic_id: confirmTarget.id });
        toast.success("Cabinet supprimé");
      } else {
        await call({ action: "delete_insurer", insurer_id: confirmTarget.id });
        toast.success("Assureur supprimé");
      }
      setConfirmTarget(null);
      setConfirmText("");
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Échec de la suppression");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Gérer cabinets & assureurs</h1>
        <p className="text-gray-600">
          Suppression définitive — utile pour nettoyer les organisations de test.
        </p>
      </div>

      {loading && <p className="text-sm text-gray-500">Chargement…</p>}

      {!loading && (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Cabinets ({clinics.length})</h2>
            {clinics.length === 0 && <p className="text-sm text-gray-500">Aucun cabinet.</p>}
            {clinics.map((c) => (
              <Card key={c.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500">
                    {c.type === "multi_specialist" ? "Multi-spécialiste" : "Spécialiste"} ·{" "}
                    {c.clinic_staff?.[0]?.count ?? 0} membre(s) ·{" "}
                    {c.consultations?.[0]?.count ?? 0} consultation(s) ·{" "}
                    {new Date(c.created_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setConfirmTarget({ kind: "clinic", id: c.id, name: c.name });
                    setConfirmText("");
                  }}
                  className="text-red-600 text-sm hover:underline"
                >
                  Supprimer
                </button>
              </Card>
            ))}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Assureurs ({insurers.length})</h2>
            {insurers.length === 0 && <p className="text-sm text-gray-500">Aucun assureur.</p>}
            {insurers.map((i) => (
              <Card key={i.id} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{i.name}</div>
                  <div className="text-xs text-gray-500">
                    {i.verification_level ?? "—"} · {i.insurer_staff?.[0]?.count ?? 0} membre(s)
                  </div>
                </div>
                <button
                  onClick={() => {
                    setConfirmTarget({ kind: "insurer", id: i.id, name: i.name });
                    setConfirmText("");
                  }}
                  className="text-red-600 text-sm hover:underline"
                >
                  Supprimer
                </button>
              </Card>
            ))}
          </section>
        </>
      )}

      {confirmTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="max-w-md w-full space-y-3">
            <h3 className="font-semibold text-lg text-red-700">
              Supprimer « {confirmTarget.name} » ?
            </h3>
            <p className="text-sm text-gray-600">
              {confirmTarget.kind === "clinic"
                ? "Ça supprime définitivement le cabinet, son équipe, ses consultations et les patients qui n'ont aucun autre cabinet lié. Irréversible."
                : "Ça supprime définitivement l'assureur et son équipe. Les consultations liées sont conservées côté cabinet mais perdent leur lien assureur. Irréversible."}
            </p>
            <p className="text-sm">
              Tape <span className="font-mono font-semibold">{confirmTarget.name}</span> pour confirmer :
            </p>
            <input
              className="w-full border rounded p-2 text-sm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setConfirmTarget(null)}
                className="px-4 py-2 text-sm rounded border"
              >
                Annuler
              </button>
              <Button
                onClick={confirmDelete}
                disabled={deleting || confirmText.trim() !== confirmTarget.name}
              >
                {deleting ? "Suppression…" : "Supprimer définitivement"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
