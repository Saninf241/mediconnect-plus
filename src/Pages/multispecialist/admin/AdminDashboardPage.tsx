// src/Pages/multispecialist/admin/AdminDashboardPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Card, CardContent } from "../../../components/ui/card";
import { useClinicId } from "../../../hooks/useClinicId";

type StatusFilter = "all" | "draft" | "sent" | "accepted" | "paid" | "rejected";
type PeriodFilter = "all" | "7d" | "30d" | "month";

interface StaffRow {
  id: string;
  name: string | null;
  role: string | null;
  clinic_id?: string | null;
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

interface DoctorStats {
  doctorId: string;
  doctorName: string;
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  paid: number;
  rejected: number;
  amount: number;
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

export default function AdminDashboardPage() {
  const { clinicId, loadingClinic, source, debugMessage } = useClinicId();

  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  const [staffRows, setStaffRows] = useState<StaffRow[]>([]);
  const [allConsultations, setAllConsultations] = useState<ConsultationRow[]>([]);
  const [supportCount, setSupportCount] = useState(0);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [doctorFilter, setDoctorFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    if (loadingClinic) return;

    const fetchData = async () => {
      setLoading(true);
      setNote(null);

      try {
        if (!clinicId) {
          setNote("Aucun clinicId détecté pour ce compte admin.");
          setLoading(false);
          return;
        }

        // clinic_staff
        const staffRes = await supabase
          .from("clinic_staff")
          .select("id, name, role, clinic_id")
          .eq("clinic_id", clinicId);

        if (staffRes.error) {
          console.error("[AdminDashboard] clinic_staff error:", staffRes.error);
          setNote(`Erreur clinic_staff: ${staffRes.error.message}`);
          setStaffRows([]);
        } else {
          setStaffRows((staffRes.data ?? []) as StaffRow[]);
        }

        // consultations complètes pour les KPI
        const consultationsRes = await supabase
          .from("consultations")
          .select("id, clinic_id, doctor_id, patient_id, amount, status, created_at")
          .eq("clinic_id", clinicId)
          .order("created_at", { ascending: false });

        if (consultationsRes.error) {
          console.error("[AdminDashboard] consultations error:", consultationsRes.error);
          setNote((prev) =>
            prev
              ? `${prev} | Erreur consultations: ${consultationsRes.error.message}`
              : `Erreur consultations: ${consultationsRes.error.message}`
          );
          setAllConsultations([]);
        } else {
          setAllConsultations((consultationsRes.data ?? []) as ConsultationRow[]);
        }

        // support
        const supportRes = await supabase
          .from("support_messages")
          .select("id")
          .eq("clinic_id", clinicId)
          .eq("status", "open");

        if (supportRes.error) {
          setSupportCount(0);
        } else {
          setSupportCount(supportRes.data?.length ?? 0);
        }
      } catch (e) {
        console.error("[AdminDashboard] unexpected error:", e);
        setNote("Erreur inattendue lors du chargement du dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [clinicId, loadingClinic]);

  const doctors = useMemo(() => {
    return staffRows.filter(
      (r) => (r.role ?? "").toString().trim().toLowerCase() === "doctor"
    );
  }, [staffRows]);

  const doctorMap = useMemo(() => {
    const map = new Map<string, string>();
    doctors.forEach((d) => map.set(d.id, d.name || "Médecin"));
    return map;
  }, [doctors]);

  const filteredConsultations = useMemo(() => {
    const startDate = getStartDate(periodFilter);

    return allConsultations.filter((c) => {
      const status = (c.status ?? "").toLowerCase();
      const doctorId = c.doctor_id ?? "";
      const createdAt = c.created_at ? new Date(c.created_at) : null;

      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (doctorFilter !== "all" && doctorId !== doctorFilter) return false;

      if (startDate && createdAt && createdAt < new Date(startDate)) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const doctorName = (doctorMap.get(doctorId) ?? "").toLowerCase();

        const matches =
          c.id?.toLowerCase().includes(q) ||
          (c.patient_id ?? "").toLowerCase().includes(q) ||
          doctorName.includes(q) ||
          status.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [allConsultations, statusFilter, doctorFilter, periodFilter, searchTerm, doctorMap]);

  const paginatedConsultations = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredConsultations.slice(start, start + pageSize);
  }, [filteredConsultations, page]);

  const totalPages = Math.max(1, Math.ceil(filteredConsultations.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [statusFilter, doctorFilter, periodFilter, searchTerm]);

  const globalStats = useMemo(() => {
    const base = filteredConsultations;

    let totalAmount = 0;
    let draft = 0;
    let sent = 0;
    let accepted = 0;
    let paid = 0;
    let rejected = 0;

    base.forEach((c) => {
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
      total: base.length,
      totalAmount,
      draft,
      sent,
      accepted,
      paid,
      rejected,
    };
  }, [filteredConsultations]);

  const doctorStats = useMemo(() => {
    const stats = new Map<string, DoctorStats>();

    filteredConsultations.forEach((c) => {
      const doctorId = c.doctor_id ?? "unknown";
      const doctorName = doctorMap.get(doctorId) ?? "Médecin inconnu";
      const status = (c.status ?? "").toLowerCase();
      const amount = Number(c.amount) || 0;

      if (!stats.has(doctorId)) {
        stats.set(doctorId, {
          doctorId,
          doctorName,
          total: 0,
          draft: 0,
          sent: 0,
          accepted: 0,
          paid: 0,
          rejected: 0,
          amount: 0,
        });
      }

      const row = stats.get(doctorId)!;
      row.total += 1;
      row.amount += amount;

      if (status === "draft") row.draft += 1;
      if (status === "sent") row.sent += 1;
      if (status === "accepted") row.accepted += 1;
      if (status === "paid") row.paid += 1;
      if (status === "rejected") row.rejected += 1;
    });

    return Array.from(stats.values()).sort((a, b) => b.amount - a.amount || b.total - a.total);
  }, [filteredConsultations, doctorMap]);

  if (loadingClinic || loading) {
    return <div className="p-6">Chargement du tableau de bord admin…</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {note && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          {note}
        </div>
      )}

      {debugMessage && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          {debugMessage}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">Tableau de bord - Direction</h1>
        <p className="text-sm text-gray-500">
          Vision globale de l’activité du cabinet / de la clinique
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <p><span className="font-semibold">clinicId détecté :</span> {clinicId || "Aucun"}</p>
          <p><span className="font-semibold">Source du clinicId :</span> {source}</p>
          <p><span className="font-semibold">Lignes clinic_staff visibles :</span> {staffRows.length}</p>
          <p><span className="font-semibold">Médecins détectés :</span> {doctors.length}</p>
          <p><span className="font-semibold">Demandes support ouvertes :</span> {supportCount}</p>
        </CardContent>
      </Card>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Statut</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="mt-1 w-full rounded-md border px-3 py-2"
              >
                <option value="all">Tous</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="paid">Paid</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Médecin</label>
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2"
              >
                <option value="all">Tous les médecins</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name || "Médecin"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Période</label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                className="mt-1 w-full rounded-md border px-3 py-2"
              >
                <option value="all">Toute la période</option>
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
                <option value="month">Mois en cours</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Recherche</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ID, patient, médecin, statut..."
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Consultations</p>
          <p className="text-2xl font-bold">{globalStats.total}</p>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Draft</p>
          <p className="text-2xl font-bold text-slate-600">{globalStats.draft}</p>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Sent</p>
          <p className="text-2xl font-bold text-amber-600">{globalStats.sent}</p>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Accepted</p>
          <p className="text-2xl font-bold text-blue-600">{globalStats.accepted}</p>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Paid</p>
          <p className="text-2xl font-bold text-green-600">{globalStats.paid}</p>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{globalStats.rejected}</p>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Montant total</p>
          <p className="text-xl font-bold">{formatMoney(globalStats.totalAmount)}</p>
        </CardContent></Card>
      </div>

      {/* Performance médecins */}
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-3">Performance par médecin</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Médecin</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Draft</th>
                  <th className="py-2">Sent</th>
                  <th className="py-2">Accepted</th>
                  <th className="py-2">Paid</th>
                  <th className="py-2">Rejected</th>
                  <th className="py-2">Montant</th>
                </tr>
              </thead>
              <tbody>
                {doctorStats.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-4 text-gray-500">
                      Aucune donnée pour les filtres sélectionnés.
                    </td>
                  </tr>
                ) : (
                  doctorStats.map((row) => (
                    <tr key={row.doctorId} className="border-b">
                      <td className="py-2 font-medium">{row.doctorName}</td>
                      <td className="py-2">{row.total}</td>
                      <td className="py-2">{row.draft}</td>
                      <td className="py-2">{row.sent}</td>
                      <td className="py-2">{row.accepted}</td>
                      <td className="py-2">{row.paid}</td>
                      <td className="py-2">{row.rejected}</td>
                      <td className="py-2">{formatMoney(row.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Liste consultations */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Consultations</h2>
            <p className="text-sm text-gray-500">
              {filteredConsultations.length} résultat(s)
            </p>
          </div>

          {paginatedConsultations.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune consultation pour ces filtres.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2">Date</th>
                      <th className="py-2">Médecin</th>
                      <th className="py-2">Patient ID</th>
                      <th className="py-2">Statut</th>
                      <th className="py-2">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedConsultations.map((c) => (
                      <tr key={c.id} className="border-b">
                        <td className="py-2">
                          {c.created_at
                            ? new Date(c.created_at).toLocaleString("fr-FR")
                            : "-"}
                        </td>
                        <td className="py-2">
                          {doctorMap.get(c.doctor_id ?? "") || "Médecin inconnu"}
                        </td>
                        <td className="py-2">{c.patient_id || "-"}</td>
                        <td className="py-2">{c.status || "-"}</td>
                        <td className="py-2">{formatMoney(Number(c.amount) || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded border px-3 py-2 text-sm disabled:opacity-50"
                >
                  Précédent
                </button>

                <p className="text-sm text-gray-500">
                  Page {page} / {totalPages}
                </p>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded border px-3 py-2 text-sm disabled:opacity-50"
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