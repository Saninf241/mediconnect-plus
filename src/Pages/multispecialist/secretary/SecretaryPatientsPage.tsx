import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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

export default function SecretaryPatientsPage() {
  const { clinicId, loadingClinic } = useClinicId();
  const location = useLocation();
  const isSpecialist = location.pathname.startsWith("/specialist/secretary");
  const newPatientPath = isSpecialist ? "/specialist/secretary/new" : "/multispecialist/secretary/new";
  const appointmentsPath = isSpecialist
    ? "/specialist/secretary/appointments"
    : "/multispecialist/secretary/appointments";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [assuranceFilter, setAssuranceFilter] = useState<AssuranceFilter>("all");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", phone: "", date_of_birth: "" });
  const [nameLocked, setNameLocked] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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
    if (!error && data) setPatients(data.filter((p) => p.status !== "merged"));
    if (error) {
      console.error("[SecretaryPatientsPage] fetch error:", error);
      toast.error("Erreur lors du chargement des patients.");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (loadingClinic) return;
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, loadingClinic]);

  const filteredPatients = useMemo(() => {
    const q = normalize(search.trim());

    return patients.filter((p) => {
      if (assuranceFilter === "assured" && !p.is_assured) return false;
      if (assuranceFilter === "uninsured" && p.is_assured) return false;

      if (!q) return true;

      return (
        normalize(p.name).includes(q) ||
        normalize(p.phone || "").includes(q) ||
        normalize(p.email || "").includes(q) ||
        normalize(p.national_id || "").includes(q)
      );
    });
  }, [patients, search, assuranceFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, assuranceFilter, pageSize]);

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
                      <th className="py-3 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPatients.map((p) => (
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
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => openEdit(p)}
                              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                            >
                              Modifier
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
                    ))}
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
    </div>
  );
}
