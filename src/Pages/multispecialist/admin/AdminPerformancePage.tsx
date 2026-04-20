// src/Pages/multispecialist/admin/AdminPerformancePage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useClinicId } from "../../../hooks/useClinicId";
import { Card, CardContent } from "../../../components/ui/card";

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
}

interface DoctorPerformance {
  doctorId: string;
  doctorName: string;
  totalConsultations: number;
  draftCount: number;
  sentCount: number;
  acceptedCount: number;
  paidCount: number;
  rejectedCount: number;
  totalAmount: number;
  sentAmount: number;
  acceptedAmount: number;
  paidAmount: number;
  avgAmount: number;
  rejectionRate: number;
  completionRate: number;
}

type SortKey =
  | "totalConsultations"
  | "totalAmount"
  | "paidAmount"
  | "sentCount"
  | "acceptedCount"
  | "rejectedCount"
  | "draftCount"
  | "completionRate";

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

function Bar({
  value,
  max,
  colorClass,
}: {
  value: number;
  max: number;
  colorClass: string;
}) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 6 : 0) : 0;

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        className={`h-full rounded-full ${colorClass}`}
        style={{ width: `${Math.min(width, 100)}%` }}
      />
    </div>
  );
}

export default function AdminPerformancePage() {
  const { clinicId, loadingClinic } = useClinicId();

  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");
  const [doctorSearch, setDoctorSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("totalAmount");

  const [staffRows, setStaffRows] = useState<StaffRow[]>([]);
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);

  useEffect(() => {
    if (loadingClinic) return;

    const fetchData = async () => {
      setLoading(true);
      setNote(null);

      try {
        if (!clinicId) {
          setNote("Impossible de charger la performance pour cet établissement.");
          setLoading(false);
          return;
        }

        const startDate = getStartDate(periodFilter);

        const staffRes = await supabase
          .from("clinic_staff")
          .select("id, name, role")
          .eq("clinic_id", clinicId);

        if (staffRes.error) {
          console.error("[AdminPerformancePage] clinic_staff error:", staffRes.error);
          setStaffRows([]);
          setNote("Erreur lors du chargement de l'équipe.");
        } else {
          setStaffRows((staffRes.data ?? []) as StaffRow[]);
        }

        let query = supabase
          .from("consultations")
          .select("id, clinic_id, doctor_id, patient_id, amount, status, created_at")
          .eq("clinic_id", clinicId)
          .order("created_at", { ascending: false });

        if (startDate) {
          query = query.gte("created_at", startDate);
        }

        const consultationsRes = await query;

        if (consultationsRes.error) {
          console.error("[AdminPerformancePage] consultations error:", consultationsRes.error);
          setConsultations([]);
          setNote("Erreur lors du chargement des consultations.");
        } else {
          setConsultations((consultationsRes.data ?? []) as ConsultationRow[]);
        }
      } catch (error) {
        console.error("[AdminPerformancePage] unexpected error:", error);
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

  const performanceRows = useMemo(() => {
    const map = new Map<string, DoctorPerformance>();

    doctors.forEach((doctor) => {
      map.set(doctor.id, {
        doctorId: doctor.id,
        doctorName: doctor.name || "Médecin",
        totalConsultations: 0,
        draftCount: 0,
        sentCount: 0,
        acceptedCount: 0,
        paidCount: 0,
        rejectedCount: 0,
        totalAmount: 0,
        sentAmount: 0,
        acceptedAmount: 0,
        paidAmount: 0,
        avgAmount: 0,
        rejectionRate: 0,
        completionRate: 0,
      });
    });

    consultations.forEach((consultation) => {
      const doctorId = consultation.doctor_id;
      if (!doctorId || !map.has(doctorId)) return;

      const row = map.get(doctorId)!;
      const status = (consultation.status ?? "").toLowerCase();
      const amount = Number(consultation.amount) || 0;

      row.totalConsultations += 1;
      row.totalAmount += amount;

      if (status === "draft") row.draftCount += 1;
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
      if (status === "rejected") row.rejectedCount += 1;
    });

    const rows = Array.from(map.values()).map((row) => {
      const decisionBase = row.acceptedCount + row.paidCount + row.rejectedCount;
      const nonDraftBase =
        row.sentCount + row.acceptedCount + row.paidCount + row.rejectedCount;

      return {
        ...row,
        avgAmount:
          row.totalConsultations > 0 ? Math.round(row.totalAmount / row.totalConsultations) : 0,
        rejectionRate:
          decisionBase > 0 ? Math.round((row.rejectedCount / decisionBase) * 100) : 0,
        completionRate:
          row.totalConsultations > 0
            ? Math.round((nonDraftBase / row.totalConsultations) * 100)
            : 0,
      };
    });

    const filtered = rows.filter((row) =>
      row.doctorName.toLowerCase().includes(doctorSearch.trim().toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "totalConsultations") return b.totalConsultations - a.totalConsultations;
      if (sortBy === "totalAmount") return b.totalAmount - a.totalAmount;
      if (sortBy === "paidAmount") return b.paidAmount - a.paidAmount;
      if (sortBy === "sentCount") return b.sentCount - a.sentCount;
      if (sortBy === "acceptedCount") return b.acceptedCount - a.acceptedCount;
      if (sortBy === "rejectedCount") return b.rejectedCount - a.rejectedCount;
      if (sortBy === "draftCount") return b.draftCount - a.draftCount;
      if (sortBy === "completionRate") return b.completionRate - a.completionRate;
      return b.totalAmount - a.totalAmount;
    });

    return sorted;
  }, [consultations, doctors, doctorSearch, sortBy]);

  const summary = useMemo(() => {
    let totalConsultations = 0;
    let totalAmount = 0;
    let totalPaidAmount = 0;
    let totalRejected = 0;
    let totalDraft = 0;

    performanceRows.forEach((row) => {
      totalConsultations += row.totalConsultations;
      totalAmount += row.totalAmount;
      totalPaidAmount += row.paidAmount;
      totalRejected += row.rejectedCount;
      totalDraft += row.draftCount;
    });

    const bestDoctor = performanceRows[0] ?? null;

    return {
      doctorCount: performanceRows.length,
      totalConsultations,
      totalAmount,
      totalPaidAmount,
      totalRejected,
      totalDraft,
      bestDoctor,
    };
  }, [performanceRows]);

  const maxTotalConsultations = useMemo(() => {
    return Math.max(...performanceRows.map((row) => row.totalConsultations), 1);
  }, [performanceRows]);

  if (loadingClinic || loading) {
    return <div className="p-6">Chargement de la performance des médecins…</div>;
  }

  return (
    <div className="space-y-6">
      {note && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {note}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Performance des médecins</h1>
        <p className="text-sm text-gray-500">
          Comparaison de l’activité et des résultats par praticien.
        </p>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
              <label className="text-sm font-medium text-gray-700">Tri principal</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="totalAmount">Montant total</option>
                <option value="paidAmount">Montant payé</option>
                <option value="totalConsultations">Consultations</option>
                <option value="sentCount">Envoyées</option>
                <option value="acceptedCount">Acceptées</option>
                <option value="rejectedCount">Rejetées</option>
                <option value="draftCount">Brouillons</option>
                <option value="completionRate">Taux d’avancement</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Recherche médecin</label>
              <input
                type="text"
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                placeholder="Nom du médecin..."
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Résumé */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Médecins analysés</p>
            <p className="mt-1 text-2xl font-bold">{summary.doctorCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Consultations</p>
            <p className="mt-1 text-2xl font-bold">{summary.totalConsultations}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Montant total</p>
            <p className="mt-1 text-xl font-bold">{formatMoney(summary.totalAmount)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Montant payé</p>
            <p className="mt-1 text-xl font-bold text-green-600">
              {formatMoney(summary.totalPaidAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Brouillons</p>
            <p className="mt-1 text-2xl font-bold text-slate-700">{summary.totalDraft}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Rejets</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{summary.totalRejected}</p>
            <p className="mt-1 text-xs text-gray-400">
              {summary.bestDoctor ? `Top actuel : ${summary.bestDoctor.doctorName}` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cartes médecins */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {performanceRows.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-gray-500">
              Aucune donnée disponible pour les filtres sélectionnés.
            </CardContent>
          </Card>
        ) : (
          performanceRows.map((row, index) => (
            <Card key={row.doctorId}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{row.doctorName}</p>
                    <p className="text-sm text-gray-500">Rang #{index + 1}</p>
                  </div>

                  <div className="rounded-lg bg-gray-50 px-3 py-2 text-right">
                    <p className="text-xs text-gray-500">Montant total</p>
                    <p className="font-semibold">{formatMoney(row.totalAmount)}</p>
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-gray-600">Volume d’activité</span>
                    <span className="font-medium">{row.totalConsultations} consultation(s)</span>
                  </div>
                  <Bar
                    value={row.totalConsultations}
                    max={maxTotalConsultations}
                    colorClass="bg-gray-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Brouillons</p>
                    <p className="mt-1 text-lg font-semibold text-slate-700">{row.draftCount}</p>
                  </div>

                  <div className="rounded-lg bg-amber-50 p-3">
                    <p className="text-xs text-amber-600">Envoyées</p>
                    <p className="mt-1 text-lg font-semibold text-amber-700">{row.sentCount}</p>
                  </div>

                  <div className="rounded-lg bg-blue-50 p-3">
                    <p className="text-xs text-blue-600">Acceptées</p>
                    <p className="mt-1 text-lg font-semibold text-blue-700">{row.acceptedCount}</p>
                  </div>

                  <div className="rounded-lg bg-red-50 p-3">
                    <p className="text-xs text-red-600">Rejetées</p>
                    <p className="mt-1 text-lg font-semibold text-red-700">{row.rejectedCount}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-gray-500">Montant moyen</p>
                    <p className="mt-1 font-semibold">{formatMoney(row.avgAmount)}</p>
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-gray-500">Montant envoyé</p>
                    <p className="mt-1 font-semibold text-amber-700">
                      {formatMoney(row.sentAmount)}
                    </p>
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-gray-500">Montant accepté</p>
                    <p className="mt-1 font-semibold text-blue-700">
                      {formatMoney(row.acceptedAmount)}
                    </p>
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-gray-500">Montant payé</p>
                    <p className="mt-1 font-semibold text-green-700">
                      {formatMoney(row.paidAmount)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Taux d’avancement</p>
                    <p className="mt-1 text-lg font-semibold">{row.completionRate}%</p>
                    <p className="text-xs text-gray-400">
                      dossiers sortis du brouillon
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Taux de rejet</p>
                    <p className="mt-1 text-lg font-semibold text-red-600">
                      {row.rejectionRate}%
                    </p>
                    <p className="text-xs text-gray-400">
                      sur dossiers décidés
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Tableau synthétique */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Tableau comparatif</h2>
            <p className="text-sm text-gray-500">
              Lecture rapide des indicateurs clés par médecin.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-3 pr-4">Médecin</th>
                  <th className="py-3 pr-4">Consultations</th>
                  <th className="py-3 pr-4">Brouillons</th>
                  <th className="py-3 pr-4">Envoyées</th>
                  <th className="py-3 pr-4">Acceptées</th>
                  <th className="py-3 pr-4">Payées</th>
                  <th className="py-3 pr-4">Rejetées</th>
                  <th className="py-3 pr-4">Montant total</th>
                  <th className="py-3 pr-4">Montant payé</th>
                  <th className="py-3 pr-4">Avancement</th>
                  <th className="py-3 pr-4">Rejet</th>
                </tr>
              </thead>
              <tbody>
                {performanceRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-6 text-center text-gray-400">
                      Aucune donnée disponible.
                    </td>
                  </tr>
                ) : (
                  performanceRows.map((row) => (
                    <tr key={row.doctorId} className="border-b last:border-b-0">
                      <td className="py-3 pr-4 font-medium text-gray-900">{row.doctorName}</td>
                      <td className="py-3 pr-4">{row.totalConsultations}</td>
                      <td className="py-3 pr-4 text-slate-700">{row.draftCount}</td>
                      <td className="py-3 pr-4 text-amber-700">{row.sentCount}</td>
                      <td className="py-3 pr-4 text-blue-700">{row.acceptedCount}</td>
                      <td className="py-3 pr-4 text-green-700">{row.paidCount}</td>
                      <td className="py-3 pr-4 text-red-700">{row.rejectedCount}</td>
                      <td className="py-3 pr-4">{formatMoney(row.totalAmount)}</td>
                      <td className="py-3 pr-4 text-green-700">{formatMoney(row.paidAmount)}</td>
                      <td className="py-3 pr-4">{row.completionRate}%</td>
                      <td className="py-3 pr-4 text-red-600">{row.rejectionRate}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}