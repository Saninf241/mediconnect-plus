// src/Pages/multispecialist/admin/AdminPatientsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useClinicId } from "../../../hooks/useClinicId";
import { Card, CardContent } from "../../../components/ui/card";

type PeriodFilter = "all" | "7d" | "30d" | "month";
type AssuranceFilter = "all" | "assured" | "uninsured";
type FingerprintFilter = "all" | "ok" | "missing";

interface ConsultationRow {
  patient_id: string | null;
  clinic_id: string | null;
  created_at: string | null;
}

interface PatientRow {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  is_assured?: boolean | null;
  fingerprint_missing?: boolean | null;
  created_at?: string | null;
}

interface AdminPatientItem {
  id: string;
  patientName: string;
  email: string | null;
  phone: string | null;
  isAssured: boolean;
  fingerprintMissing: boolean;
  createdAt: string | null;
  consultationCount: number;
  lastConsultationAt: string | null;
}

function getStartDate(period: PeriodFilter): string | null {
  const now = new Date();

  if (period === "7d") {
    const d = new Date();
    d.setDate(now.getDate() - 7);
    return d.toISOString();
  }

  if (period === "30d") {
    const d = new Date();
    d.setDate(now.getDate() - 30);
    return d.toISOString();
  }

  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }

  return null;
}

function getPatientName(patient: PatientRow) {
  return patient.name || patient.name || "Patient sans nom";
}

export default function AdminPatientsPage() {
  const { clinicId, loadingClinic } = useClinicId();

  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [assuranceFilter, setAssuranceFilter] = useState<AssuranceFilter>("all");
  const [fingerprintFilter, setFingerprintFilter] = useState<FingerprintFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);

  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    if (loadingClinic) return;

    const fetchData = async () => {
      setLoading(true);
      setNote(null);

      try {
        if (!clinicId) {
          setNote("Impossible de charger les patients pour cet établissement.");
          setLoading(false);
          return;
        }

        const startDate = getStartDate(periodFilter);

        const patientsRes = await supabase
          .from("patients")
          .select("id, name, email, phone, is_assured, fingerprint_missing, created_at")
          .order("created_at", { ascending: false });

        if (patientsRes.error) {
          console.error("[AdminPatientsPage] patients error:", patientsRes.error);
          setPatients([]);
          setNote("Erreur lors du chargement des patients.");
        } else {
          setPatients((patientsRes.data ?? []) as PatientRow[]);
        }

        let consultationsQuery = supabase
          .from("consultations")
          .select("patient_id, clinic_id, created_at")
          .eq("clinic_id", clinicId)
          .not("patient_id", "is", null)
          .order("created_at", { ascending: false });

        if (startDate) {
          consultationsQuery = consultationsQuery.gte("created_at", startDate);
        }

        const consultationsRes = await consultationsQuery;

        if (consultationsRes.error) {
          console.error("[AdminPatientsPage] consultations error:", consultationsRes.error);
          setConsultations([]);
          setNote((prev) =>
            prev
              ? `${prev} Impossible de charger l’activité patient.`
              : "Impossible de charger l’activité patient."
          );
        } else {
          setConsultations((consultationsRes.data ?? []) as ConsultationRow[]);
        }
      } catch (error) {
        console.error("[AdminPatientsPage] unexpected error:", error);
        setNote("Une erreur inattendue est survenue.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clinicId, loadingClinic, periodFilter]);

  const patientActivityMap = useMemo(() => {
    const map = new Map<
      string,
      {
        consultationCount: number;
        lastConsultationAt: string | null;
      }
    >();

    consultations.forEach((c) => {
      if (!c.patient_id) return;

      if (!map.has(c.patient_id)) {
        map.set(c.patient_id, {
          consultationCount: 0,
          lastConsultationAt: c.created_at ?? null,
        });
      }

      const current = map.get(c.patient_id)!;
      current.consultationCount += 1;

      if (
        c.created_at &&
        (!current.lastConsultationAt ||
          new Date(c.created_at) > new Date(current.lastConsultationAt))
      ) {
        current.lastConsultationAt = c.created_at;
      }
    });

    return map;
  }, [consultations]);

  const clinicPatients = useMemo(() => {
    const ids = new Set(consultations.map((c) => c.patient_id).filter(Boolean) as string[]);

    return patients
      .filter((patient) => ids.has(patient.id))
      .map((patient) => {
        const activity = patientActivityMap.get(patient.id);

        return {
          id: patient.id,
          patientName: getPatientName(patient),
          email: patient.email ?? null,
          phone: patient.phone ?? null,
          isAssured: !!patient.is_assured,
          fingerprintMissing: !!patient.fingerprint_missing,
          createdAt: patient.created_at ?? null,
          consultationCount: activity?.consultationCount ?? 0,
          lastConsultationAt: activity?.lastConsultationAt ?? null,
        } satisfies AdminPatientItem;
      });
  }, [patients, consultations, patientActivityMap]);

  const filteredPatients = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return clinicPatients.filter((patient) => {
      if (assuranceFilter === "assured" && !patient.isAssured) return false;
      if (assuranceFilter === "uninsured" && patient.isAssured) return false;

      if (fingerprintFilter === "ok" && patient.fingerprintMissing) return false;
      if (fingerprintFilter === "missing" && !patient.fingerprintMissing) return false;

      if (!q) return true;

      return (
        patient.patientName.toLowerCase().includes(q) ||
        (patient.email ?? "").toLowerCase().includes(q) ||
        (patient.phone ?? "").toLowerCase().includes(q) ||
        patient.id.toLowerCase().includes(q)
      );
    });
  }, [clinicPatients, assuranceFilter, fingerprintFilter, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [periodFilter, assuranceFilter, fingerprintFilter, searchTerm]);

  const summary = useMemo(() => {
    const total = filteredPatients.length;
    const assured = filteredPatients.filter((p) => p.isAssured).length;
    const uninsured = filteredPatients.filter((p) => !p.isAssured).length;
    const fingerprintMissing = filteredPatients.filter((p) => p.fingerprintMissing).length;
    const fingerprintOk = filteredPatients.filter((p) => !p.fingerprintMissing).length;

    return {
      total,
      assured,
      uninsured,
      fingerprintMissing,
      fingerprintOk,
    };
  }, [filteredPatients]);

  const paginatedPatients = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPatients.slice(start, start + pageSize);
  }, [filteredPatients, page]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize));

  if (loadingClinic || loading) {
    return <div className="p-6">Chargement des patients…</div>;
  }

  return (
    <div className="space-y-6">
      {note && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {note}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
        <p className="text-sm text-gray-500">
          Vue administrative des patients suivis dans l’établissement.
        </p>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Patients suivis</p>
            <p className="mt-1 text-2xl font-bold">{summary.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Assurés</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{summary.assured}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Non assurés</p>
            <p className="mt-1 text-2xl font-bold text-slate-700">{summary.uninsured}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Empreinte OK</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{summary.fingerprintOk}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Empreinte manquante</p>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {summary.fingerprintMissing}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Période d’activité</label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="all">Toute la période</option>
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
                <option value="month">Mois en cours</option>
              </select>
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
              <label className="text-sm font-medium text-gray-700">Biométrie</label>
              <select
                value={fingerprintFilter}
                onChange={(e) => setFingerprintFilter(e.target.value as FingerprintFilter)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="all">Tous</option>
                <option value="ok">Empreinte OK</option>
                <option value="missing">Empreinte manquante</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Recherche</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nom, email, téléphone, ID..."
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste patients */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Liste des patients</h2>
              <p className="text-sm text-gray-500">
                Patients ayant une activité dans ce cabinet selon la période choisie.
              </p>
            </div>
            <span className="text-sm text-gray-400">
              {filteredPatients.length} patient(s)
            </span>
          </div>

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
                      <th className="py-3 pr-4">Assurance</th>
                      <th className="py-3 pr-4">Biométrie</th>
                      <th className="py-3 pr-4">Consultations</th>
                      <th className="py-3 pr-4">Dernière activité</th>
                      <th className="py-3 pr-4">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPatients.map((patient) => (
                      <tr key={patient.id} className="border-b last:border-b-0">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-gray-900">{patient.patientName}</p>
                        </td>

                        <td className="py-3 pr-4 text-gray-700">
                          <div className="space-y-1">
                            <p>{patient.email || "-"}</p>
                            <p className="text-xs text-gray-500">{patient.phone || "-"}</p>
                          </div>
                        </td>

                        <td className="py-3 pr-4">
                          {patient.isAssured ? (
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
                          {patient.fingerprintMissing ? (
                            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                              Empreinte manquante
                            </span>
                          ) : (
                            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                              Empreinte OK
                            </span>
                          )}
                        </td>

                        <td className="py-3 pr-4 font-medium">{patient.consultationCount}</td>

                        <td className="py-3 pr-4 text-gray-700">
                          {patient.lastConsultationAt
                            ? new Date(patient.lastConsultationAt).toLocaleString("fr-FR")
                            : "-"}
                        </td>

                        <td className="py-3 pr-4 text-xs text-gray-500">{patient.id}</td>
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
    </div>
  );
}