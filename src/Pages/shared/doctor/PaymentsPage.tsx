// src/Pages/shared/doctor/PaymentsPage.tsx
// Visibilité du médecin sur le statut de remboursement assureur de ses propres
// consultations — jusqu'ici cette information n'existait que côté admin/assureur
// (cf. AdminPaymentsPage.tsx, dont ce fichier reprend le modèle de statut financier).
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { useDoctorContext } from "../../../hooks/useDoctorContext";
import { useDoctorScope } from "../../../hooks/useDoctorScope";

type PeriodFilter = "all" | "7d" | "30d" | "month";
type FinanceStatusFilter = "all" | "sent" | "accepted" | "paid" | "rejected";

interface ConsultationRow {
  id: string;
  patient_id: string | null;
  amount: number | null;
  status: string | null;
  created_at: string | null;
  patients?: { name?: string | null } | null;
  insurer_amount: number | null;
  payment_status: string | null;
  payment_date: string | null;
  pricing_status: string | null;
}

interface BatchRow {
  id: string;
  amount: number | null;
  commission: number | null;
  total_paid: number | null;
  status: string | null;
  consultation_count: number | null;
  created_at: string | null;
  paid_at: string | null;
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

// Le statut "paid" n'est jamais écrit sur consultations.status (le workflow de
// remboursement par lots ne touche que payment_status/payment_date, status reste
// "accepted") -- le statut financier réel prend en compte les deux.
function effectiveFinanceStatus(row: { status: string | null; payment_status: string | null }) {
  if ((row.payment_status ?? "").toLowerCase() === "paid") return "paid";
  return (row.status ?? "").toLowerCase();
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

function pricingLabel(status: string | null) {
  if (status === "computed") return "Tarification automatique";
  if (status === "manual_approved") return "Tarif ajusté (validé assureur)";
  if (!status) return "—";
  return "En attente de tarification";
}

function pricingPillClass(status: string | null) {
  if (status === "computed") return "bg-slate-100 text-slate-600";
  if (status === "manual_approved") return "bg-purple-100 text-purple-700";
  if (!status) return "bg-gray-100 text-gray-500";
  return "bg-amber-100 text-amber-700";
}

export default function PaymentsPage() {
  const doctorInfo = useDoctorContext();
  const { basePath } = useDoctorScope();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");
  const [statusFilter, setStatusFilter] = useState<FinanceStatusFilter>("all");

  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);

  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    const clinicId = doctorInfo?.clinic_id;
    const doctorId = doctorInfo?.doctor_id;
    if (!clinicId || !doctorId) return;

    const fetchData = async () => {
      setLoading(true);
      setNote(null);

      try {
        const startDate = getStartDate(periodFilter);

        let query = supabase
          .from("consultations")
          .select(
            "id, patient_id, amount, status, created_at, patients ( name ), insurer_amount, payment_status, payment_date, pricing_status"
          )
          .eq("clinic_id", clinicId)
          .eq("doctor_id", doctorId)
          .order("created_at", { ascending: false });

        if (startDate) query = query.gte("created_at", startDate);

        const consultationsRes = await query;

        if (consultationsRes.error) {
          console.error("[PaymentsPage] consultations error:", consultationsRes.error);
          setConsultations([]);
          setNote("Erreur lors du chargement des données financières.");
        } else {
          setConsultations((consultationsRes.data ?? []) as ConsultationRow[]);
        }

        // Lots de remboursement du cabinet (contexte -- pas de doctor_id sur
        // payment_batches, c'est un regroupement au niveau clinique).
        const batchesRes = await supabase
          .from("payment_batches")
          .select("id, amount, commission, total_paid, status, consultation_count, created_at, paid_at")
          .eq("clinic_id", clinicId)
          .order("created_at", { ascending: false })
          .limit(5);

        if (!batchesRes.error) {
          setBatches((batchesRes.data ?? []) as BatchRow[]);
        }
      } catch (error) {
        console.error("[PaymentsPage] unexpected error:", error);
        setNote("Une erreur inattendue est survenue.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [doctorInfo, periodFilter]);

  const financeBase = useMemo(() => {
    return consultations.filter((c) => ["sent", "accepted", "paid", "rejected"].includes(effectiveFinanceStatus(c)));
  }, [consultations]);

  const filteredRows = useMemo(() => {
    return financeBase.filter((c) => {
      const status = effectiveFinanceStatus(c);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      return true;
    });
  }, [financeBase, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [periodFilter, statusFilter]);

  const summary = useMemo(() => {
    let totalAmount = 0;
    let sentAmount = 0, sentCount = 0;
    let acceptedAmount = 0, acceptedCount = 0;
    let paidAmount = 0, paidCount = 0;
    let rejectedAmount = 0, rejectedCount = 0;
    let stuckPricingCount = 0;

    filteredRows.forEach((row) => {
      const status = effectiveFinanceStatus(row);
      const amount = Number(row.insurer_amount ?? row.amount) || 0;
      totalAmount += amount;

      if (status === "sent") { sentCount += 1; sentAmount += amount; }
      if (status === "accepted") { acceptedCount += 1; acceptedAmount += amount; }
      if (status === "paid") { paidCount += 1; paidAmount += amount; }
      if (status === "rejected") { rejectedCount += 1; rejectedAmount += amount; }
      if (row.pricing_status && row.pricing_status !== "computed" && row.pricing_status !== "manual_approved") {
        stuckPricingCount += 1;
      }
    });

    return { totalCount: filteredRows.length, totalAmount, sentCount, acceptedCount, paidCount, rejectedCount, sentAmount, acceptedAmount, paidAmount, rejectedAmount, stuckPricingCount };
  }, [filteredRows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page]);

  if (!doctorInfo || loading) {
    return <div className="p-6">Chargement des paiements…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mes paiements</h1>
        <p className="text-sm text-gray-500">Suivi du remboursement assureur de vos consultations.</p>
      </div>

      {note && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{note}</div>
      )}

      {summary.stuckPricingCount > 0 && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-800">
          {summary.stuckPricingCount} consultation(s) en attente de tarification manuelle par l'assureur.
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Période</label>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
            className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
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
            className="mt-1 block w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="all">Tous</option>
            <option value="sent">En attente assureur</option>
            <option value="accepted">Acceptées</option>
            <option value="paid">Payées</option>
            <option value="rejected">Rejetées</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Montant suivi</p>
          <p className="mt-1 text-2xl font-bold">{formatMoney(summary.totalAmount)}</p>
          <p className="mt-1 text-xs text-gray-400">{summary.totalCount} dossier(s)</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">En attente</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{formatMoney(summary.sentAmount)}</p>
          <p className="mt-1 text-xs text-gray-400">{summary.sentCount} dossier(s)</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Payé</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{formatMoney(summary.paidAmount)}</p>
          <p className="mt-1 text-xs text-gray-400">{summary.paidCount} dossier(s)</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Rejeté</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{formatMoney(summary.rejectedAmount)}</p>
          <p className="mt-1 text-xs text-gray-400">{summary.rejectedCount} dossier(s)</p>
        </div>
      </div>

      {batches.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Lots de remboursement du cabinet</h2>
          <p className="text-sm text-gray-500 mb-3">
            Regroupements clinique — pas ventilés par médecin, donnés à titre de contexte.
          </p>
          <div className="space-y-2">
            {batches.map((b) => {
              const isPaid = (b.status ?? "").toLowerCase() === "paid";
              return (
                <div key={b.id} className={`rounded-lg border px-4 py-2 text-sm ${isPaid ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span>{b.consultation_count ?? "—"} consultation(s) • Net {formatMoney(b.total_paid ?? 0)}</span>
                    <span className={`text-xs px-2 py-1 rounded font-medium ${isPaid ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                      {isPaid ? `Payé${b.paid_at ? ` le ${new Date(b.paid_at).toLocaleDateString("fr-FR")}` : ""}` : "En attente de paiement"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Mes dossiers financiers</h2>
          <span className="text-sm text-gray-400">{filteredRows.length} résultat(s)</span>
        </div>

        {paginatedRows.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun dossier financier trouvé sur cette période.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-3 pr-4">Date</th>
                    <th className="py-3 pr-4">Patient</th>
                    <th className="py-3 pr-4">Statut</th>
                    <th className="py-3 pr-4">Tarification</th>
                    <th className="py-3 pr-4">Déclaré</th>
                    <th className="py-3 pr-4">Approuvé assureur</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row) => {
                    const finStatus = effectiveFinanceStatus(row);
                    return (
                      <tr
                        key={row.id}
                        className="border-b last:border-b-0 cursor-pointer hover:bg-gray-50"
                        onClick={() => navigate(`${basePath}/consultations/${row.id}`)}
                      >
                        <td className="py-3 pr-4">{row.created_at ? new Date(row.created_at).toLocaleDateString("fr-FR") : "-"}</td>
                        <td className="py-3 pr-4 text-gray-700">{row.patients?.name || row.patient_id || "-"}</td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusPillClass(finStatus)}`}>
                            {statusLabel(finStatus)}
                          </span>
                          {finStatus === "paid" && row.payment_date && (
                            <span className="ml-1 text-xs text-gray-400">le {new Date(row.payment_date).toLocaleDateString("fr-FR")}</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${pricingPillClass(row.pricing_status)}`}>
                            {pricingLabel(row.pricing_status)}
                          </span>
                        </td>
                        <td className="py-3 pr-4">{formatMoney(Number(row.amount) || 0)}</td>
                        <td className="py-3 pr-4 font-medium">{row.insurer_amount != null ? formatMoney(row.insurer_amount) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">
                Précédent
              </button>
              <p className="text-sm text-gray-500">Page {page} / {totalPages}</p>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">
                Suivant
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
