// src/Pages/developer/ManageOrgsPage.tsx
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

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

type Convention = {
  id: string;
  active: boolean;
  created_at: string;
  clinics: { id: string; name: string } | null;
  insurers: { id: string; name: string } | null;
};

type PaymentInfo = {
  id: string;
  clinic_id: string;
  payment_method: "bank_transfer" | "mobile_money";
  bank_name: string | null;
  account_number: string | null;
  account_holder_name: string | null;
  mobile_money_provider: string | null;
  mobile_money_number: string | null;
  status: "pending" | "verified" | "rejected";
  submitted_by_name: string | null;
  submitted_by_role: string | null;
  submitted_at: string;
  rejection_reason: string | null;
  clinics: { name: string } | null;
};

type DirectoryMember = {
  id: string;
  full_name: string;
  national_id: string | null;
  member_no: string | null;
  plan_code: string | null;
  is_active: boolean;
  created_at: string;
  created_by_name: string | null;
  created_by_role: string | null;
};

export default function ManageOrgsPage() {
  const { getToken } = useAuth();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [insurers, setInsurers] = useState<Insurer[]>([]);
  const [conventions, setConventions] = useState<Convention[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmTarget, setConfirmTarget] = useState<
    { kind: "clinic" | "insurer"; id: string; name: string } | null
  >(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [newConventionClinic, setNewConventionClinic] = useState("");
  const [newConventionInsurer, setNewConventionInsurer] = useState("");
  const [addingConvention, setAddingConvention] = useState(false);

  const [updatingLevelFor, setUpdatingLevelFor] = useState<string | null>(null);

  // Base adherents (accompagnement N3) : un seul panneau ouvert a la fois.
  const [directoryFor, setDirectoryFor] = useState<string | null>(null);
  const [directoryMembers, setDirectoryMembers] = useState<DirectoryMember[]>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryForm, setDirectoryForm] = useState({
    full_name: "",
    national_id: "",
    member_no: "",
    plan_code: "",
  });
  const [addingDirectoryMember, setAddingDirectoryMember] = useState(false);

  // Coordonnees de paiement (RIB / mobile money) en attente de verification.
  const [paymentInfoList, setPaymentInfoList] = useState<PaymentInfo[]>([]);
  const [paymentInfoFilter, setPaymentInfoFilter] = useState<"pending" | "all">("pending");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [rejectingFor, setRejectingFor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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
      const [c, i, cv, pi] = await Promise.all([
        call({ action: "list_clinics" }),
        call({ action: "list_insurers" }),
        call({ action: "list_conventions" }),
        call({ action: "list_pending_payment_info" }),
      ]);
      setClinics(c.clinics ?? []);
      setInsurers(i.insurers ?? []);
      setConventions(cv.conventions ?? []);
      setPaymentInfoList(pi.payment_info ?? []);
    } catch (err: any) {
      toast.error(err.message || "Impossible de charger la liste");
    } finally {
      setLoading(false);
    }
  }

  async function verifyPaymentInfo(id: string) {
    setVerifyingId(id);
    try {
      await call({ action: "verify_clinic_payment_info", id });
      toast.success("Coordonnées vérifiées");
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Échec de la vérification");
    } finally {
      setVerifyingId(null);
    }
  }

  async function rejectPaymentInfo() {
    if (!rejectingFor || !rejectReason.trim()) return;
    try {
      await call({ action: "reject_clinic_payment_info", id: rejectingFor, reason: rejectReason.trim() });
      toast.success("Coordonnées rejetées");
      setRejectingFor(null);
      setRejectReason("");
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Échec du rejet");
    }
  }

  async function addConvention() {
    if (!newConventionClinic || !newConventionInsurer) return;
    setAddingConvention(true);
    try {
      await call({
        action: "add_convention",
        clinic_id: newConventionClinic,
        insurer_id: newConventionInsurer,
      });
      toast.success("Convention ajoutée");
      setNewConventionClinic("");
      setNewConventionInsurer("");
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Échec de l'ajout");
    } finally {
      setAddingConvention(false);
    }
  }

  async function removeConvention(id: string) {
    try {
      await call({ action: "remove_convention", id });
      toast.success("Convention retirée");
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Échec de la suppression");
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateVerificationLevel(insurerId: string, level: string) {
    setUpdatingLevelFor(insurerId);
    try {
      await call({ action: "update_insurer_verification_level", insurer_id: insurerId, verification_level: level });
      toast.success("Niveau mis à jour");
      await loadAll();
    } catch (err: any) {
      toast.error(err.message || "Échec de la mise à jour");
    } finally {
      setUpdatingLevelFor(null);
    }
  }

  async function toggleDirectory(insurerId: string) {
    if (directoryFor === insurerId) {
      setDirectoryFor(null);
      return;
    }
    setDirectoryFor(insurerId);
    setDirectoryLoading(true);
    try {
      const res = await call({ action: "list_directory_members", insurer_id: insurerId });
      setDirectoryMembers(res.members ?? []);
    } catch (err: any) {
      toast.error(err.message || "Impossible de charger la base adhérents");
      setDirectoryMembers([]);
    } finally {
      setDirectoryLoading(false);
    }
  }

  async function addDirectoryMember() {
    if (!directoryFor) return;
    if (!directoryForm.full_name.trim() || (!directoryForm.member_no.trim() && !directoryForm.national_id.trim())) {
      toast.error("Nom complet et (n° adhérent ou NIN) requis.");
      return;
    }
    setAddingDirectoryMember(true);
    try {
      await call({
        action: "add_directory_member",
        insurer_id: directoryFor,
        full_name: directoryForm.full_name.trim(),
        national_id: directoryForm.national_id.trim() || null,
        member_no: directoryForm.member_no.trim() || null,
        plan_code: directoryForm.plan_code.trim() || null,
      });
      toast.success("Adhérent ajouté");
      setDirectoryForm({ full_name: "", national_id: "", member_no: "", plan_code: "" });
      const res = await call({ action: "list_directory_members", insurer_id: directoryFor });
      setDirectoryMembers(res.members ?? []);
    } catch (err: any) {
      toast.error(err.message || "Échec de l'ajout");
    } finally {
      setAddingDirectoryMember(false);
    }
  }

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
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Coordonnées de paiement à vérifier</h2>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => setPaymentInfoFilter("pending")}
                  className={`px-2 py-1 rounded border ${paymentInfoFilter === "pending" ? "bg-gray-900 text-white" : ""}`}
                >
                  En attente
                </button>
                <button
                  onClick={() => setPaymentInfoFilter("all")}
                  className={`px-2 py-1 rounded border ${paymentInfoFilter === "all" ? "bg-gray-900 text-white" : ""}`}
                >
                  Toutes
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Toute soumission/modification par un cabinet repart en attente — ne devient la
              destination active des virements qu'après vérification manuelle ici.
            </p>
            {paymentInfoList.filter((p) => paymentInfoFilter === "all" || p.status === "pending").length === 0 && (
              <p className="text-sm text-gray-500">Aucune soumission à afficher.</p>
            )}
            {paymentInfoList
              .filter((p) => paymentInfoFilter === "all" || p.status === "pending")
              .map((p) => (
                <Card key={p.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{p.clinics?.name ?? "—"}</div>
                      <div className="text-xs text-gray-500">
                        Soumis par {p.submitted_by_name ?? "?"} ({p.submitted_by_role ?? "?"}) le{" "}
                        {new Date(p.submitted_at).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded font-medium ${
                        p.status === "verified"
                          ? "bg-green-100 text-green-800"
                          : p.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {p.status === "verified" ? "Vérifié" : p.status === "rejected" ? "Rejeté" : "En attente"}
                    </span>
                  </div>

                  <div className="text-sm text-gray-700">
                    {p.payment_method === "bank_transfer" ? (
                      <>
                        Virement — {p.bank_name} · {p.account_number} · titulaire : {p.account_holder_name}
                      </>
                    ) : (
                      <>
                        Mobile money — {p.mobile_money_provider} · {p.mobile_money_number}
                      </>
                    )}
                  </div>

                  {p.status === "rejected" && p.rejection_reason && (
                    <p className="text-xs text-red-700">Motif : {p.rejection_reason}</p>
                  )}

                  {p.status !== "verified" && (
                    <div className="flex gap-2">
                      <Button onClick={() => verifyPaymentInfo(p.id)} disabled={verifyingId === p.id}>
                        {verifyingId === p.id ? "..." : "Vérifier"}
                      </Button>
                      <button
                        onClick={() => {
                          setRejectingFor(p.id);
                          setRejectReason("");
                        }}
                        className="text-red-600 text-sm hover:underline"
                      >
                        Rejeter
                      </button>
                    </div>
                  )}
                </Card>
              ))}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Assureurs ({insurers.length})</h2>
            <p className="text-xs text-gray-500">
              N1 = intégration automatisée (API/fichier fréquent). N2 = base consultable mais via
              une action humaine. N3 = aucune base numérique — déclaratif, accompagné.
            </p>
            {insurers.length === 0 && <p className="text-sm text-gray-500">Aucun assureur.</p>}
            {insurers.map((i) => (
              <Card key={i.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{i.name}</div>
                    <div className="text-xs text-gray-500">{i.insurer_staff?.[0]?.count ?? 0} membre(s)</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      className="border rounded text-xs px-2 py-1"
                      value={i.verification_level ?? "N3"}
                      disabled={updatingLevelFor === i.id}
                      onChange={(e) => updateVerificationLevel(i.id, e.target.value)}
                    >
                      <option value="N1">N1 — intégration automatisée</option>
                      <option value="N2">N2 — base consultable manuellement</option>
                      <option value="N3">N3 — déclaratif</option>
                    </select>
                    <button
                      onClick={() => toggleDirectory(i.id)}
                      className="text-indigo-700 text-sm hover:underline whitespace-nowrap"
                    >
                      {directoryFor === i.id ? "Fermer" : "Base adhérents"}
                    </button>
                    <button
                      onClick={() => {
                        setConfirmTarget({ kind: "insurer", id: i.id, name: i.name });
                        setConfirmText("");
                      }}
                      className="text-red-600 text-sm hover:underline"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>

                {directoryFor === i.id && (
                  <div className="border-t pt-3 space-y-3">
                    <p className="text-xs text-gray-500">
                      Adhérents que vous déclarez pour le compte de cet assureur (accompagnement
                      N3, sans compte staff opérationnel côté assureur) — sert au rapprochement
                      best-effort lors de la déclaration d'un patient assuré.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Nom complet"
                        value={directoryForm.full_name}
                        onChange={(e) => setDirectoryForm({ ...directoryForm, full_name: e.target.value })}
                      />
                      <Input
                        placeholder="N° adhérent"
                        value={directoryForm.member_no}
                        onChange={(e) => setDirectoryForm({ ...directoryForm, member_no: e.target.value })}
                      />
                      <Input
                        placeholder="NIN"
                        value={directoryForm.national_id}
                        onChange={(e) => setDirectoryForm({ ...directoryForm, national_id: e.target.value })}
                      />
                      <Input
                        placeholder="Code plan"
                        value={directoryForm.plan_code}
                        onChange={(e) => setDirectoryForm({ ...directoryForm, plan_code: e.target.value })}
                      />
                    </div>
                    <Button onClick={addDirectoryMember} disabled={addingDirectoryMember}>
                      {addingDirectoryMember ? "Ajout…" : "Ajouter l'adhérent"}
                    </Button>

                    {directoryLoading ? (
                      <p className="text-sm text-gray-500">Chargement…</p>
                    ) : directoryMembers.length === 0 ? (
                      <p className="text-sm text-gray-500">Aucun adhérent déclaré.</p>
                    ) : (
                      <div className="space-y-1">
                        {directoryMembers.map((m) => (
                          <div key={m.id} className="text-xs text-gray-600 flex justify-between border-b py-1">
                            <span>
                              {m.full_name} · N° {m.member_no ?? "—"} · NIN {m.national_id ?? "—"} · Plan{" "}
                              {m.plan_code ?? "—"}
                              {!m.is_active && <span className="text-red-600"> (inactif)</span>}
                            </span>
                            <span className="text-gray-400">
                              par {m.created_by_name ?? "?"} ({m.created_by_role ?? "?"})
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Conventions cabinet ↔ assureur ({conventions.length})</h2>
            <p className="text-sm text-gray-500">
              Seuls les assureurs conventionnés avec un cabinet sont proposés à la secrétaire lors
              de la création d'un patient assuré.
            </p>

            <Card className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs text-gray-500">Cabinet</label>
                <select
                  className="w-full border rounded p-2 text-sm"
                  value={newConventionClinic}
                  onChange={(e) => setNewConventionClinic(e.target.value)}
                >
                  <option value="">— choisir —</option>
                  {clinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs text-gray-500">Assureur</label>
                <select
                  className="w-full border rounded p-2 text-sm"
                  value={newConventionInsurer}
                  onChange={(e) => setNewConventionInsurer(e.target.value)}
                >
                  <option value="">— choisir —</option>
                  {insurers.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={addConvention}
                disabled={addingConvention || !newConventionClinic || !newConventionInsurer}
              >
                {addingConvention ? "Ajout…" : "Ajouter"}
              </Button>
            </Card>

            {conventions.length === 0 && (
              <p className="text-sm text-gray-500">Aucune convention pour l'instant.</p>
            )}
            {conventions.map((cv) => (
              <Card key={cv.id} className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">{cv.clinics?.name ?? "—"}</span>
                  <span className="text-gray-400 mx-2">↔</span>
                  <span className="font-medium">{cv.insurers?.name ?? "—"}</span>
                </div>
                <button
                  onClick={() => removeConvention(cv.id)}
                  className="text-red-600 text-sm hover:underline"
                >
                  Retirer
                </button>
              </Card>
            ))}
          </section>
        </>
      )}

      {rejectingFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="max-w-md w-full space-y-3">
            <h3 className="font-semibold text-lg">Rejeter ces coordonnées de paiement</h3>
            <textarea
              className="w-full border rounded p-2 text-sm"
              rows={3}
              placeholder="Motif du rejet (visible par le cabinet)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setRejectingFor(null)} className="px-4 py-2 text-sm rounded border">
                Annuler
              </button>
              <Button onClick={rejectPaymentInfo} disabled={!rejectReason.trim()}>
                Rejeter
              </Button>
            </div>
          </Card>
        </div>
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
