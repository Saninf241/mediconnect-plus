// src/pages/multispecialist/admin/AdminConsultationsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useClinicId } from "../../../hooks/useClinicId";
import { Card, CardContent } from "../../../components/ui/card";

type StatusFilter = "all" | "draft" | "sent" | "accepted" | "paid" | "rejected";
type PeriodFilter = "all" | "7d" | "30d" | "month";

interface StaffRow {
  id: string;
  name: string | null;
  role: string | null;
}

interface ConsultationRow {
  id: string;
  clinic_id: string | null;
  doctor_id: string | null;
  patient_id: string | null;
  amount: number | null;
  status: string | null;
  created_at: string | null;
  updated_at?: string | null;
}

function formatMoney(value: number) {
  return `${value.toLocaleString("fr-FR")} FCFA`;
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

function statusLabel(status: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s === "draft") return "Brouillon";
  if (s === "sent") return "Envoyée";
  if (s === "accepted") return "Acceptée";
  if (s === "paid") return "Payée";
  if (s === "rejected") return "Rejetée";
  return status || "-";
}

function statusPillClass(status: string | null) {
  const s = (status ?? "").toLowerCase();

  if (s === "draft") return "bg-slate-100 text-slate-700";
  if (s === "sent") return "bg-amber-100 text-amber-700";
  if (s === "accepted") return "bg-blue-100 text-blue-700";
  if (s === "paid") return "bg-green-100 text-green-700";
  if (s === "rejected") return "bg-red-100 text-red-700";

  return "bg-gray-100 text-gray-700";
}

export default function AdminConsultationsPage() {
  const { clinicId, loadingClinic } = useClinicId();

  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  const [staffRows, setStaffRows] = useState<StaffRow[]>([]);
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [doctorFilter, setDoctorFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");
  const [searchTerm, setSearchTerm] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    if (loadingClinic) return;

    const fetchData = async () => {
      setLoading(true);
      setNote(null);

      try {
        if (!clinicId) {
          setNote("Impossible de charger les consultations pour cet établissement.");
          setLoading(false);
          return;
        }

        const startDate = getStartDate(periodFilter);

        const staffRes = await supabase
          .from("clinic_staff")
          .select("id, name, role")
          .eq("clinic_id", clinicId);

        if (staffRes.error) {
          console.error("[AdminConsultationsPage] clinic_staff error:", staffRes.error);
          setStaffRows([]);
        } else {
          setStaffRows((staffRes.data ?? []) as StaffRow[]);
        }

        let query = supabase
          .from("consultations")
          .select("id, clinic_id, doctor_id, patient_id, amount, status, created_at, updated_at")
          .eq("clinic_id", clinicId)
          .order("created_at", { ascending: false });

        if (startDate) {
          query = query.gte("created_at", startDate);
        }

        const consultationsRes = await query;

        if (consultationsRes.error) {
          console.error("[AdminConsultationsPage] consultations error:", consultationsRes.error);
          setNote("Erreur lors du chargement des consultations.");
          setConsultations([]);
        } else {
          setConsultations((consultationsRes.data ?? []) as ConsultationRow[]);
        }
      } catch (error) {
        console.error("[AdminConsultationsPage] unexpected error:", error);
        setNote("Une erreur inattendue est survenue.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clinicId, loadingClinic, periodFilter]);

  const doctors = useMemo(() => {
    return staffRows.filter(
      (row) => (row.role ?? "").toLowerCase().trim() === "doctor"
    );
  }, [staffRows]);

  const doctorMap = useMemo(() => {
    const map = new Map<string, string>();
    doctors.forEach((doctor) => {
      map.set(doctor.id, doctor.name || "Médecin");
    });
    return map;
  }, [doctors]);

  const filteredConsultations = useMemo(() => {
    return consultations.filter((c) => {
      const status = (c.status ?? "").toLowerCase();
      const doctorId = c.doctor_id ?? "";
      const query = searchTerm.trim().toLowerCase();

      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (doctorFilter !== "all" && doctorId !== doctorFilter) return false;

      if (!query) return true;

      const doctorName = (doctorMap.get(doctorId) ?? "").toLowerCase();
      const amountString = String(Number(c.amount) || 0);

      return (
        (c.id ?? "").toLowerCase().includes(query) ||
        (c.patient_id ?? "").toLowerCase().includes(query) ||
        doctorName.includes(query) ||
        status.includes(query) ||
        amountString.includes(query)
      );
    });
  }, [consultations, statusFilter, doctorFilter, searchTerm, doctorMap]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, doctorFilter, periodFilter, searchTerm]);

  const summary = useMemo(() => {
    let draft = 0;
    let sent = 0;
    let accepted = 0;
    let paid = 0;
    let rejected = 0;
    let totalAmount = 0;

    filteredConsultations.forEach((c) => {
      const status = (c.status ?? "").toLowerCase();
      const amount = Number(c.amount) || 0;

      totalAmount += amount;

      if (status === "draft") draft += 1;
      if (status === "sent") sent += 1;
      if (status === "accepted") accepted += 1;
      if (status === "paid") paid += 1;
      if (status === "rejected") rejected += 1;
    });

    return {
      total: filteredConsultations.length,
      draft,
      sent,
      accepted,
      paid,
      rejected,
      totalAmount,
    };
  }, [filteredConsultations]);

  const totalPages = Math.max(1, Math.ceil(filteredConsultations.length / pageSize));

  const paginatedConsultations = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredConsultations.slice(start, start + pageSize);
  }, [filteredConsultations, page]);

  if (loadingClinic || loading) {
    return <div className="p-6">Chargement des consultations…</div>;
  }

  return (
    <div className="space-y-6">
      {note && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {note}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Consultations</h1>
        <p className="text-sm text-gray-500">
          Suivi détaillé des dossiers du cabinet.
        </p>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Statut</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="all">Tous les statuts</option>
                <option value="draft">Brouillon</option>
                <option value="sent">Envoyée</option>
                <option value="accepted">Acceptée</option>
                <option value="paid">Payée</option>
                <option value="rejected">Rejetée</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Médecin</label>
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="all">Tous les médecins</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name || "Médecin"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Période</label>
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
              <label className="text-sm font-medium text-gray-700">Recherche</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ID consultation, patient, médecin..."
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Résumé */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-7">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Résultats</p>
            <p className="mt-1 text-2xl font-bold">{summary.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Brouillons</p>
            <p className="mt-1 text-2xl font-bold text-slate-700">{summary.draft}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Envoyées</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{summary.sent}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Acceptées</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{summary.accepted}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Payées</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{summary.paid}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Rejetées</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{summary.rejected}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Montant</p>
            <p className="mt-1 text-xl font-bold">{formatMoney(summary.totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tableau */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Liste des consultations</h2>
              <p className="text-sm text-gray-500">
                Détails des dossiers selon les filtres sélectionnés.
              </p>
            </div>
            <span className="text-sm text-gray-400">
              {filteredConsultations.length} résultat(s)
            </span>
          </div>

          {paginatedConsultations.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune consultation trouvée.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-3 pr-4">Date</th>
                      <th className="py-3 pr-4">Médecin</th>
                      <th className="py-3 pr-4">Patient</th>
                      <th className="py-3 pr-4">Statut</th>
                      <th className="py-3 pr-4">Montant</th>
                      <th className="py-3 pr-4">ID consultation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedConsultations.map((c) => (
                      <tr key={c.id} className="border-b last:border-b-0">
                        <td className="py-3 pr-4">
                          {c.created_at
                            ? new Date(c.created_at).toLocaleString("fr-FR")
                            : "-"}
                        </td>
                        <td className="py-3 pr-4 font-medium text-gray-900">
                          {doctorMap.get(c.doctor_id ?? "") || "Médecin inconnu"}
                        </td>
                        <td className="py-3 pr-4 text-gray-700">{c.patient_id || "-"}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusPillClass(
                              c.status
                            )}`}
                          >
                            {statusLabel(c.status)}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-medium">
                          {formatMoney(Number(c.amount) || 0)}
                        </td>
                        <td className="py-3 pr-4 text-xs text-gray-500">{c.id}</td>
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