import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "../../../lib/supabase";
import { Input } from "../../../components/ui/input";
import Modal from "../../../components/ui/dialog";
import { Card, CardContent } from "../../../components/ui/card";
import { toast } from "react-toastify";
import { useClinicId } from "../../../hooks/useClinicId";

type AssuranceFilter = "all" | "assured" | "uninsured";

interface Patient {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  national_id: string | null;
  is_assured: boolean | null;
  fingerprint_enrolled: boolean | null;
  status: string | null;
}

interface EditForm {
  name: string;
  phone: string;
  date_of_birth: string;
}

// Insensible aux accents en plus de la casse (ex: "amelie" doit retrouver "Amélie").
const normalize = (v: string) =>
  v.normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "").toLowerCase();

interface ActiveMembership {
  id: string;
  insurer_id: string;
  insurer_name: string;
  member_no: string | null;
  plan_code: string | null;
  coverage_start: string | null;
  coverage_end: string | null;
}

interface AttachForm {
  insurer_id: string;
  member_no: string;
  plan_code: string;
  coverage_start: string;
  coverage_end: string;
}

const defaultAttachForm: AttachForm = {
  insurer_id: "",
  member_no: "",
  plan_code: "",
  coverage_start: "",
  coverage_end: "",
};

export default function SecretaryPatientsPage() {
  const { clinicId, loadingClinic } = useClinicId();
  const { user } = useUser();
  const location = useLocation();
  const isSpecialist = location.pathname.startsWith("/specialist/secretary");
  const newPatientPath = isSpecialist ? "/specialist/secretary/new" : "/multispecialist/secretary/new";
  const appointmentsPath = isSpecialist
    ? "/specialist/secretary/appointments"
    : "/multispecialist/secretary/appointments";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [membershipPatientIds, setMembershipPatientIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [assuranceFilter, setAssuranceFilter] = useState<AssuranceFilter>("all");
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", phone: "", date_of_birth: "" });
  const [nameLocked, setNameLocked] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Gestion assurance (lier / suspendre) — étape 3 & 4 du plan anti-doublon
  const [insurers, setInsurers] = useState<{ id: string; name: string; level?: "N1" | "N2" | "N3" }[]>([]);
  const [insuranceModalOpen, setInsuranceModalOpen] = useState(false);
  const [insurancePatient, setInsurancePatient] = useState<Patient | null>(null);
  const [activeMembership, setActiveMembership] = useState<ActiveMembership | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [attachForm, setAttachForm] = useState<AttachForm>({ ...defaultAttachForm });
  const [insuranceSaving, setInsuranceSaving] = useState(false);

  const fetchPatients = async () => {
    if (!clinicId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("patients")
      .select("id, name, phone, email, date_of_birth, national_id, is_assured, fingerprint_enrolled, status")
      .eq("clinic_id", clinicId)
      .order("name", { ascending: true });

    // Filtré côté client : ".neq('status', 'merged')" exclurait aussi les patients
    // dont le statut est NULL (le cas normal, cf. NULL <> 'merged' -> NULL en SQL).
    const activePatients = !error && data ? data.filter((p) => p.status !== "merged") : [];
    if (!error && data) setPatients(activePatients);
    if (error) {
      console.error("[SecretaryPatientsPage] fetch error:", error);
      toast.error("Erreur lors du chargement des patients.");
    }

    // Un patient marqué "assuré" sans ligne insurer_memberships correspondante
    // est un dossier incomplet (carte/vérification jamais finalisée) — signal
    // beaucoup plus fiable que fingerprint_missing, qui est vrai pour la
    // quasi-totalité des patients et n'aide donc pas la secrétaire à prioriser.
    const assuredIds = activePatients.filter((p) => p.is_assured).map((p) => p.id);
    if (assuredIds.length > 0) {
      const { data: memberships, error: membershipError } = await supabase
        .from("insurer_memberships")
        .select("patient_id")
        .in("patient_id", assuredIds);
      if (!membershipError && memberships) {
        setMembershipPatientIds(new Set(memberships.map((m) => m.patient_id)));
      }
    } else {
      setMembershipPatientIds(new Set());
    }

    setLoading(false);
  };

  useEffect(() => {
    if (loadingClinic) return;
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, loadingClinic]);

  // Assureurs conventionnés avec ce cabinet (même restriction que le wizard
  // de création : on ne propose que des assureurs avec une convention réelle).
  useEffect(() => {
    if (!clinicId) return;
    (async () => {
      const { data, error } = await supabase
        .from("clinic_insurer_conventions")
        .select("insurers:insurer_id(id, name, verification_level)")
        .eq("clinic_id", clinicId)
        .eq("active", true);

      if (error) {
        console.error("[SecretaryPatientsPage] chargement conventions assureur:", error);
        setInsurers([]);
        return;
      }

      setInsurers(
        (data ?? [])
          .map((row: any) => row.insurers)
          .filter(Boolean)
          .map((x: any) => ({
            id: x.id,
            name: x.name,
            level: (x.verification_level as "N1" | "N2" | "N3") ?? "N3",
          }))
      );
    })();
  }, [clinicId]);

  const openInsuranceModal = async (patient: Patient) => {
    setInsurancePatient(patient);
    setAttachForm({ ...defaultAttachForm });
    setInsuranceModalOpen(true);
    setMembershipLoading(true);

    const { data, error } = await supabase
      .from("insurer_memberships")
      .select("id, insurer_id, member_no, plan_code, coverage_start, coverage_end, insurers:insurer_id(name)")
      .eq("patient_id", patient.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[SecretaryPatientsPage] chargement adhésion:", error);
      setActiveMembership(null);
    } else if (data) {
      setActiveMembership({
        id: data.id,
        insurer_id: data.insurer_id,
        insurer_name: (data as any).insurers?.name ?? "Assureur",
        member_no: data.member_no,
        plan_code: data.plan_code,
        coverage_start: data.coverage_start,
        coverage_end: data.coverage_end,
      });
    } else {
      setActiveMembership(null);
    }
    setMembershipLoading(false);
  };

  const closeInsuranceModal = () => {
    setInsuranceModalOpen(false);
    setInsurancePatient(null);
    setActiveMembership(null);
    setAttachForm({ ...defaultAttachForm });
  };

  const handleAttachInsurance = async () => {
    if (!insurancePatient) return;
    if (!attachForm.insurer_id) {
      toast.error("Sélectionne un assureur conventionné avec ce cabinet.");
      return;
    }

    setInsuranceSaving(true);
    const found = insurers.find((i) => i.id === attachForm.insurer_id);

    const { error: memErr } = await supabase.from("insurer_memberships").insert({
      patient_id: insurancePatient.id,
      insurer_id: attachForm.insurer_id,
      member_no: attachForm.member_no || "",
      plan_code: attachForm.plan_code || null,
      coverage_start: attachForm.coverage_start || null,
      coverage_end: attachForm.coverage_end || null,
      last_verified_at: new Date().toISOString(),
      verification_level: found?.level ?? "N3",
      confidence: "declarative",
      source: { method: "convention_declarative" },
      is_active: true,
      status: "active",
      created_by_clerk_user_id: user?.id ?? null,
      created_by_role: "secretary",
      created_by_name: user?.fullName || user?.primaryEmailAddress?.emailAddress || null,
      created_by_email: user?.primaryEmailAddress?.emailAddress ?? null,
    });

    if (memErr) {
      console.error("[SecretaryPatientsPage] attach insurance error:", memErr);
      toast.error("Erreur lors du rattachement de l'assurance.");
      setInsuranceSaving(false);
      return;
    }

    const { error: patErr } = await supabase
      .from("patients")
      .update({ is_assured: true, status: "verified" })
      .eq("id", insurancePatient.id);

    if (patErr) {
      console.error("[SecretaryPatientsPage] patient update after attach:", patErr);
    }

    toast.success("Assurance rattachée au patient.");
    setInsuranceSaving(false);
    closeInsuranceModal();
    await fetchPatients();
  };

  const handleSuspendInsurance = async () => {
    if (!insurancePatient || !activeMembership) return;

    setInsuranceSaving(true);
    const { error: memErr } = await supabase
      .from("insurer_memberships")
      .update({ is_active: false, status: "suspended" })
      .eq("id", activeMembership.id);

    if (memErr) {
      console.error("[SecretaryPatientsPage] suspend insurance error:", memErr);
      toast.error("Erreur lors de la suspension de l'adhésion.");
      setInsuranceSaving(false);
      return;
    }

    const { error: patErr } = await supabase
      .from("patients")
      .update({ is_assured: false })
      .eq("id", insurancePatient.id);

    if (patErr) {
      console.error("[SecretaryPatientsPage] patient update after suspend:", patErr);
    }

    toast.success("Adhésion suspendue.");
    setInsuranceSaving(false);
    closeInsuranceModal();
    await fetchPatients();
  };

  const dossierIssues = (p: Patient) => {
    const issues: string[] = [];
    if (!p.phone) issues.push("Sans téléphone");
    if (p.is_assured && !membershipPatientIds.has(p.id)) issues.push("Assuré sans dossier");
    return issues;
  };

  const filteredPatients = useMemo(() => {
    const q = normalize(search.trim());

    return patients.filter((p) => {
      if (assuranceFilter === "assured" && !p.is_assured) return false;
      if (assuranceFilter === "uninsured" && p.is_assured) return false;
      if (incompleteOnly && dossierIssues(p).length === 0) return false;

      if (!q) return true;

      return (
        normalize(p.name).includes(q) ||
        normalize(p.phone || "").includes(q) ||
        normalize(p.email || "").includes(q) ||
        normalize(p.national_id || "").includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients, search, assuranceFilter, incompleteOnly, membershipPatientIds]);

  useEffect(() => {
    setPage(1);
  }, [search, assuranceFilter, incompleteOnly, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
  const paginatedPatients = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPatients.slice(start, start + pageSize);
  }, [filteredPatients, page, pageSize]);

  const openEdit = (patient: Patient) => {
    setEditForm({
      name: patient.name,
      phone: patient.phone || "",
      date_of_birth: patient.date_of_birth || "",
    });
    // Une fois l'identité vérifiée (empreinte enregistrée) ou liée à un
    // assureur, le nom ne doit plus pouvoir être changé en un clic : ça
    // ouvrirait une porte à la fraude (rattacher une fiche à une autre
    // identité assurée) sur une app dont le métier est justement d'empêcher ça.
    setNameLocked(!!patient.is_assured || !!patient.fingerprint_enrolled);
    setEditingPatientId(patient.id);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingPatientId || !clinicId) return;
    if (!editForm.name.trim()) {
      toast.error("Le nom est obligatoire.");
      return;
    }
    if (!editForm.date_of_birth) {
      toast.error("La date de naissance est obligatoire.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("patients")
      .update({
        ...(nameLocked ? {} : { name: editForm.name.trim() }),
        phone: editForm.phone.trim() || null,
        date_of_birth: editForm.date_of_birth,
      })
      .eq("id", editingPatientId)
      .eq("clinic_id", clinicId);
    setSaving(false);

    if (error) {
      console.error("[SecretaryPatientsPage] save error:", error);
      toast.error("Erreur lors de l'enregistrement du patient.");
      return;
    }

    toast.success("Patient mis à jour.");
    setIsModalOpen(false);
    setEditingPatientId(null);
    await fetchPatients();
  };

  if (loadingClinic || loading) {
    return <div className="p-6">Chargement des patients…</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes patients</h1>
          <p className="text-sm text-gray-500">{filteredPatients.length} patient(s)</p>
        </div>
        <Link
          to={newPatientPath}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          Nouveau patient
        </Link>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Recherche</label>
              <Input
                placeholder="Nom, téléphone, email, NIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Assurance</label>
              <select
                value={assuranceFilter}
                onChange={(e) => setAssuranceFilter(e.target.value as AssuranceFilter)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="all">Tous</option>
                <option value="assured">Assurés</option>
                <option value="uninsured">Non assurés</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Par page</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={incompleteOnly}
              onChange={(e) => setIncompleteOnly(e.target.checked)}
            />
            Dossiers incomplets uniquement (sans téléphone, ou assuré sans dossier assureur)
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          {paginatedPatients.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun patient trouvé.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-3 pr-4">Patient</th>
                      <th className="py-3 pr-4">Contact</th>
                      <th className="py-3 pr-4">Naissance</th>
                      <th className="py-3 pr-4">Assurance</th>
                      <th className="py-3 pr-4">Dossier</th>
                      <th className="py-3 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPatients.map((p) => {
                      const issues = dossierIssues(p);
                      return (
                      <tr key={p.id} className="border-b last:border-b-0">
                        <td className="py-3 pr-4 font-medium text-gray-900">{p.name}</td>
                        <td className="py-3 pr-4 text-gray-700">
                          <div className="space-y-1">
                            <p>{p.phone || "-"}</p>
                            <p className="text-xs text-gray-500">{p.email || "-"}</p>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-gray-700">
                          {p.date_of_birth
                            ? new Date(p.date_of_birth).toLocaleDateString("fr-FR")
                            : "-"}
                        </td>
                        <td className="py-3 pr-4">
                          {p.is_assured ? (
                            <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                              Assuré
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                              Non assuré
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {issues.length === 0 ? (
                            <span className="text-xs text-gray-400">-</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {issues.map((issue) => (
                                <span
                                  key={issue}
                                  className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                                >
                                  {issue}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => openEdit(p)}
                              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => openInsuranceModal(p)}
                              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                            >
                              Assurance
                            </button>
                            <Link
                              to={`${appointmentsPath}?patient=${p.id}`}
                              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                            >
                              RDV
                            </Link>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                >
                  Précédent
                </button>

                <p className="text-sm text-gray-500">
                  Page {page} / {totalPages}
                </p>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
                >
                  Suivant
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Modifier le patient">
        <div className="space-y-3">
          {nameLocked ? (
            <div>
              <div className="rounded border bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {editForm.name}
              </div>
              <p className="mt-1 text-xs text-amber-700">
                Nom verrouillé : identité déjà vérifiée (empreinte et/ou assurance liée). Contactez
                l'administrateur du cabinet pour une correction.
              </p>
            </div>
          ) : (
            <Input
              placeholder="Nom"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
          )}
          <Input
            placeholder="Téléphone"
            value={editForm.phone}
            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
          />
          <Input
            type="date"
            value={editForm.date_of_birth}
            onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition disabled:opacity-50"
          >
            {saving ? "Enregistrement..." : "Mettre à jour"}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={insuranceModalOpen}
        onClose={closeInsuranceModal}
        title={`Assurance — ${insurancePatient?.name ?? ""}`}
      >
        {membershipLoading ? (
          <p className="text-sm text-gray-500">Chargement...</p>
        ) : activeMembership ? (
          <div className="space-y-3">
            <div className="rounded-lg border bg-gray-50 p-3 text-sm">
              <p className="font-medium text-gray-900">{activeMembership.insurer_name}</p>
              <p className="text-gray-600">N° d'adhérent : {activeMembership.member_no || "-"}</p>
              {activeMembership.plan_code && (
                <p className="text-gray-600">Plan : {activeMembership.plan_code}</p>
              )}
              {(activeMembership.coverage_start || activeMembership.coverage_end) && (
                <p className="text-gray-600">
                  Couverture : {activeMembership.coverage_start || "-"} → {activeMembership.coverage_end || "-"}
                </p>
              )}
            </div>
            <button
              onClick={handleSuspendInsurance}
              disabled={insuranceSaving}
              className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700 transition disabled:opacity-50"
            >
              {insuranceSaving ? "Suspension..." : "Suspendre l'adhésion"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Aucune assurance active pour ce patient. Rattacher une couverture :
            </p>
            <div>
              <label className="text-sm font-medium text-gray-700">Assureur</label>
              <select
                value={attachForm.insurer_id}
                onChange={(e) => setAttachForm((f) => ({ ...f, insurer_id: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">— choisir —</option>
                {insurers.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
              {insurers.length === 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  Aucun assureur conventionné avec ce cabinet.
                </p>
              )}
            </div>
            <Input
              placeholder="N° d'adhérent"
              value={attachForm.member_no}
              onChange={(e) => setAttachForm((f) => ({ ...f, member_no: e.target.value }))}
            />
            <Input
              placeholder="Code plan"
              value={attachForm.plan_code}
              onChange={(e) => setAttachForm((f) => ({ ...f, plan_code: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Début de couverture</label>
                <Input
                  type="date"
                  value={attachForm.coverage_start}
                  onChange={(e) => setAttachForm((f) => ({ ...f, coverage_start: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Fin de couverture</label>
                <Input
                  type="date"
                  value={attachForm.coverage_end}
                  onChange={(e) => setAttachForm((f) => ({ ...f, coverage_end: e.target.value }))}
                />
              </div>
            </div>
            <button
              onClick={handleAttachInsurance}
              disabled={insuranceSaving}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition disabled:opacity-50"
            >
              {insuranceSaving ? "Enregistrement..." : "Attacher l'assurance"}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
