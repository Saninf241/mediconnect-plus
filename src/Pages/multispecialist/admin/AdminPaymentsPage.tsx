// src/Pages/multispecialist/admin/AdminPaymentsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useClinicId } from "../../../hooks/useClinicId";
import { Card, CardContent } from "../../../components/ui/card";

type PeriodFilter = "all" | "7d" | "30d" | "month";
type FinanceStatusFilter = "all" | "sent" | "accepted" | "paid" | "rejected";

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

interface DoctorFinanceRow {
  doctorId: string;
  doctorName: string;
  totalCount: number;
  sentCount: number;
  acceptedCount: number;
  paidCount: number;
  rejectedCount: number;
  totalAmount: number;
  sentAmount: number;
  acceptedAmount: number;
  paidAmount: number;
  rejectedAmount: number;
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
  if (s === "sent") return "En attente assureur";
  if (s === "accepted") return "Acceptée";
  if (s === "paid") return "Payée";
  if (s === "rejected") return "Rejetée";
  if (s === "draft") return "Brouillon";
  return status || "-";
}

function statusPillClass(status: string | null) {
  const s = (status ?? "").toLowerCase();

  if (s === "sent") return "bg-amber-100 text-amber-700";
  if (s === "accepted") return "bg-blue-100 text-blue-700";
  if (s === "paid") return "bg-green-100 text-green-700";
  if (s === "rejected") return "bg-red-100 text-red-700";
  if (s === "draft") return "bg-slate-100 text-slate-700";

  return "bg-gray-100 text-gray-700";
}

export default function AdminPaymentsPage() {
  const { clinicId, loadingClinic } = useClinicId();

  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");
  const [statusFilter, setStatusFilter] = useState<FinanceStatusFilter>("all");
  const [doctorFilter, setDoctorFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [staffRows, setStaffRows] = useState<StaffRow[]>([]);
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);

  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    if (loadingClinic) return;

    const fetchData = async () => {
      setLoading(true);
      setNote(null);

      try {
        if (!clinicId) {
          setNote("Impossible de charger les paiements pour cet établissement.");
          setLoading(false);
          return;
        }

        const startDate = getStartDate(periodFilter);

        const staffRes = await supabase
          .from("clinic_staff")
          .select("id, name, role")
          .eq("clinic_id", clinicId);

        if (staffRes.error) {
          console.error("[AdminPaymentsPage] clinic_staff error:", staffRes.error);
          setStaffRows([]);
          setNote("Erreur lors du chargement de l'équipe.");
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
          console.error("[AdminPaymentsPage] consultations error:", consultationsRes.error);
          setConsultations([]);
          setNote("Erreur lors du chargement des données financières.");
        } else {
          setConsultations((consultationsRes.data ?? []) as ConsultationRow[]);
        }
      } catch (error) {
        console.error("[AdminPaymentsPage] unexpected error:", error);
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

  const financeBase = useMemo(() => {
    return consultations.filter((c) => {
      const status = (c.status ?? "").toLowerCase();
      return ["sent", "accepted", "paid", "rejected"].includes(status);
    });
  }, [consultations]);

  const filteredRows = useMemo(() => {
    return financeBase.filter((c) => {
      const status = (c.status ?? "").toLowerCase();
      const doctorId = c.doctor_id ?? "";
      const q = searchTerm.trim().toLowerCase();

      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (doctorFilter !== "all" && doctorId !== doctorFilter) return false;

      if (!q) return true;

      const doctorName = (doctorMap.get(doctorId) ?? "").toLowerCase();
      const amountString = String(Number(c.amount) || 0);

      return (
        (c.id ?? "").toLowerCase().includes(q) ||
        (c.patient_id ?? "").toLowerCase().includes(q) ||
        doctorName.includes(q) ||
        status.includes(q) ||
        amountString.includes(q)
      );
    });
  }, [financeBase, statusFilter, doctorFilter, searchTerm, doctorMap]);

  useEffect(() => {
    setPage(1);
  }, [periodFilter, statusFilter, doctorFilter, searchTerm]);

  const summary = useMemo(() => {
    let totalAmount = 0;
    let sentAmount = 0;
    let acceptedAmount = 0;
    let paidAmount = 0;
    let rejectedAmount = 0;

    let sentCount = 0;
    let acceptedCount = 0;
    let paidCount = 0;
    let rejectedCount = 0;

    filteredRows.forEach((row) => {
      const status = (row.status ?? "").toLowerCase();
      const amount = Number(row.amount) || 0;

      totalAmount += amount;

      if (status === "sent") {
        sentCount += 1;
        sentAmount += amount;
      }
      if (status === "accepted") {
        acceptedCount += 1;
        acceptedAmount += amount;
      }
      if (status === "paid") {
        paidCount += 1;
        paidAmount += amount;
      }
      if (status === "rejected") {
        rejectedCount += 1;
        rejectedAmount += amount;
      }
    });

    return {
      totalCount: filteredRows.length,
      totalAmount,
      sentCount,
      acceptedCount,
      paidCount,
      rejectedCount,
      sentAmount,
      acceptedAmount,
      paidAmount,
      rejectedAmount,
    };
  }, [filteredRows]);

  const doctorFinance = useMemo(() => {
    const map = new Map<string, DoctorFinanceRow>();

    doctors.forEach((doctor) => {
      map.set(doctor.id, {
        doctorId: doctor.id,
        doctorName: doctor.name || "Médecin",
        totalCount: 0,
        sentCount: 0,
        acceptedCount: 0,
        paidCount: 0,
        rejectedCount: 0,
        totalAmount: 0,
        sentAmount: 0,
        acceptedAmount: 0,
        paidAmount: 0,
        rejectedAmount: 0,
      });
    });

    filteredRows.forEach((c) => {
      const doctorId = c.doctor_id;
      if (!doctorId || !map.has(doctorId)) return;

      const row = map.get(doctorId)!;
      const status = (c.status ?? "").toLowerCase();
      const amount = Number(c.amount) || 0;

      row.totalCount += 1;
      row.totalAmount += amount;

      if (status === "sent") {
        row.sentCount += 1;
        row.sentAmount += amount;
      }
      if (status === "accepted") {
        row.acceptedCount += 1;
        row.acceptedAmount += amount;
      }
      if (status === "paid") {
        row.paidCount += 1;
        row.paidAmount += amount;
      }
      if (status === "rejected") {
        row.rejectedCount += 1;
        row.rejectedAmount += amount;
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => b.paidAmount - a.paidAmount || b.totalAmount - a.totalAmount
    );
  }, [filteredRows, doctors]);

  const watchItems = useMemo(() => {
    const items: { title: string; text: string; tone: "amber" | "red" | "blue" }[] = [];

    if (summary.sentCount > 0) {
      items.push({
        title: "Montants en attente",
        text: `${summary.sentCount} dossier(s) pour ${formatMoney(summary.sentAmount)}`,
        tone: "amber",
      });
    }

    if (summary.rejectedCount > 0) {
      items.push({
        title: "Montants rejetés",
        text: `${summary.rejectedCount} dossier(s) pour ${formatMoney(summary.rejectedAmount)}`,
        tone: "red",
      });
    }

    if (summary.acceptedCount > 0) {
      items.push({
        title: "Montants validés non payés",
        text: `${summary.acceptedCount} dossier(s) pour ${formatMoney(summary.acceptedAmount)}`,
        tone: "blue",
      });
    }

    return items;
  }, [summary]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page]);

  if (loadingClinic || loading) {
    return <div className="p-6">Chargement des paiements & règlements…</div>;
  }

  return (
    <div className="space-y-6">
      {note && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {note}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paiements & règlements</h1>
        <p className="text-sm text-gray-500">
          Suivi des montants transmis, validés, payés et rejetés.
        </p>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              <label className="text-sm font-medium text-gray-700">Statut financier</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FinanceStatusFilter)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="all">Tous</option>
                <option value="sent">En attente assureur</option>
                <option value="accepted">Acceptées</option>
                <option value="paid">Payées</option>
                <option value="rejected">Rejetées</option>
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
              <label className="text-sm font-medium text-gray-700">Recherche</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ID, patient, médecin, montant..."
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI financiers */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Montant suivi</p>
            <p className="mt-1 text-2xl font-bold">{formatMoney(summary.totalAmount)}</p>
            <p className="mt-1 text-xs text-gray-400">{summary.totalCount} dossier(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">En attente</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {formatMoney(summary.sentAmount)}
            </p>
            <p className="mt-1 text-xs text-gray-400">{summary.sentCount} dossier(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Accepté</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {formatMoney(summary.acceptedAmount)}
            </p>
            <p className="mt-1 text-xs text-gray-400">{summary.acceptedCount} dossier(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Payé</p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {formatMoney(summary.paidAmount)}
            </p>
            <p className="mt-1 text-xs text-gray-400">{summary.paidCount} dossier(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Rejeté</p>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {formatMoney(summary.rejectedAmount)}
            </p>
            <p className="mt-1 text-xs text-gray-400">{summary.rejectedCount} dossier(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* À surveiller + performance financière médecins */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Points financiers à suivre</h2>
              <p className="text-sm text-gray-500">
                Les montants qui demandent une attention particulière.
              </p>
            </div>

            {watchItems.length === 0 ? (
              <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                Aucun point sensible détecté sur cette période.
              </div>
            ) : (
              <div className="space-y-3">
                {watchItems.map((item, index) => {
                  const className =
                    item.tone === "red"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : item.tone === "amber"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-blue-200 bg-blue-50 text-blue-700";

                  return (
                    <div
                      key={`${item.title}-${index}`}
                      className={`rounded-lg border px-4 py-3 ${className}`}
                    >
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm opacity-90">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Règlements par médecin</h2>
              <p className="text-sm text-gray-500">
                Classement par montant payé puis montant total.
              </p>
            </div>

            <div className="space-y-3">
              {doctorFinance.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune donnée disponible.</p>
              ) : (
                doctorFinance.map((row) => (
                  <div
                    key={row.doctorId}
                    className="rounded-xl border bg-white px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900">{row.doctorName}</p>
                        <p className="text-xs text-gray-500">
                          {row.totalCount} dossier(s) • {formatMoney(row.totalAmount)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-gray-500">Montant payé</p>
                        <p className="font-semibold text-green-700">
                          {formatMoney(row.paidAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className="rounded-lg bg-amber-50 p-2">
                        <p className="text-[11px] text-amber-600">En attente</p>
                        <p className="font-medium text-amber-700">
                          {formatMoney(row.sentAmount)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-blue-50 p-2">
                        <p className="text-[11px] text-blue-600">Accepté</p>
                        <p className="font-medium text-blue-700">
                          {formatMoney(row.acceptedAmount)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-green-50 p-2">
                        <p className="text-[11px] text-green-600">Payé</p>
                        <p className="font-medium text-green-700">
                          {formatMoney(row.paidAmount)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-red-50 p-2">
                        <p className="text-[11px] text-red-600">Rejeté</p>
                        <p className="font-medium text-red-700">
                          {formatMoney(row.rejectedAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des dossiers financiers */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Dossiers financiers</h2>
              <p className="text-sm text-gray-500">
                Liste détaillée des consultations avec impact financier.
              </p>
            </div>
            <span className="text-sm text-gray-400">
              {filteredRows.length} résultat(s)
            </span>
          </div>

          {paginatedRows.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun dossier financier trouvé.</p>
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
                      <th className="py-3 pr-4">ID dossier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row) => (
                      <tr key={row.id} className="border-b last:border-b-0">
                        <td className="py-3 pr-4">
                          {row.created_at
                            ? new Date(row.created_at).toLocaleString("fr-FR")
                            : "-"}
                        </td>
                        <td className="py-3 pr-4 font-medium text-gray-900">
                          {doctorMap.get(row.doctor_id ?? "") || "Médecin inconnu"}
                        </td>
                        <td className="py-3 pr-4 text-gray-700">{row.patient_id || "-"}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusPillClass(
                              row.status
                            )}`}
                          >
                            {statusLabel(row.status)}
                          </span>
                        </td>
                        <td className="py-3 pr-4 font-medium">
                          {formatMoney(Number(row.amount) || 0)}
                        </td>
                        <td className="py-3 pr-4 text-xs text-gray-500">{row.id}</td>
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