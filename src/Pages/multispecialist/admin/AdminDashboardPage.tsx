// src/Pages/multispecialist/admin/AdminDashboardPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Card, CardContent } from "../../../components/ui/card";
import { useClinicId } from "../../../hooks/useClinicId";

type PeriodFilter = "7d" | "30d" | "month" | "all";

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

interface DoctorStats {
  doctorId: string;
  doctorName: string;
  total: number;
  draft: number;
  sent: number;
  accepted: number;
  paid: number;
  rejected: number;
  amountTotal: number;
  amountSent: number;
  amountAccepted: number;
  amountPaid: number;
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

function Bar({
  label,
  value,
  max,
  colorClass,
}: {
  label: string;
  value: number;
  max: number;
  colorClass: string;
}) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 6 : 0) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${Math.min(width, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { clinicId, loadingClinic } = useClinicId();

  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  const [period, setPeriod] = useState<PeriodFilter>("30d");
  const [staffRows, setStaffRows] = useState<StaffRow[]>([]);
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [supportCount, setSupportCount] = useState(0);

  useEffect(() => {
    if (loadingClinic) return;

    const fetchDashboard = async () => {
      setLoading(true);
      setNote(null);

      try {
        if (!clinicId) {
          setNote("Impossible de charger le tableau de bord pour cet établissement.");
          setLoading(false);
          return;
        }

        const startDate = getStartDate(period);

        const staffRes = await supabase
          .from("clinic_staff")
          .select("id, name, role")
          .eq("clinic_id", clinicId);

        if (staffRes.error) {
          console.error("[AdminDashboard] clinic_staff error:", staffRes.error);
          setNote("Erreur lors du chargement de l'équipe.");
          setStaffRows([]);
        } else {
          setStaffRows((staffRes.data ?? []) as StaffRow[]);
        }

        let consultationsQuery = supabase
          .from("consultations")
          .select("id, clinic_id, doctor_id, patient_id, amount, status, created_at, updated_at")
          .eq("clinic_id", clinicId)
          .order("created_at", { ascending: false });

        if (startDate) {
          consultationsQuery = consultationsQuery.gte("created_at", startDate);
        }

        const consultationsRes = await consultationsQuery;

        if (consultationsRes.error) {
          console.error("[AdminDashboard] consultations error:", consultationsRes.error);
          setNote("Erreur lors du chargement des consultations.");
          setConsultations([]);
        } else {
          setConsultations((consultationsRes.data ?? []) as ConsultationRow[]);
        }

        const supportRes = await supabase
          .from("support_messages")
          .select("id")
          .eq("clinic_id", clinicId)
          .eq("status", "open");

        setSupportCount(supportRes.error ? 0 : supportRes.data?.length ?? 0);
      } catch (error) {
        console.error("[AdminDashboard] unexpected error:", error);
        setNote("Une erreur inattendue est survenue.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [clinicId, loadingClinic, period]);

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

  const metrics = useMemo(() => {
    let draft = 0;
    let sent = 0;
    let accepted = 0;
    let paid = 0;
    let rejected = 0;

    let amountTotal = 0;
    let amountDraft = 0;
    let amountSent = 0;
    let amountAccepted = 0;
    let amountPaid = 0;
    let amountRejected = 0;

    const activeDoctors = new Set<string>();

    consultations.forEach((c) => {
      const status = (c.status ?? "").toLowerCase();
      const amount = Number(c.amount) || 0;

      amountTotal += amount;
      if (c.doctor_id) activeDoctors.add(c.doctor_id);

      if (status === "draft") {
        draft += 1;
        amountDraft += amount;
      }
      if (status === "sent") {
        sent += 1;
        amountSent += amount;
      }
      if (status === "accepted") {
        accepted += 1;
        amountAccepted += amount;
      }
      if (status === "paid") {
        paid += 1;
        amountPaid += amount;
      }
      if (status === "rejected") {
        rejected += 1;
        amountRejected += amount;
      }
    });

    const total = consultations.length;
    const decisionCount = accepted + paid + rejected;
    const rejectionRate =
      decisionCount > 0 ? Math.round((rejected / decisionCount) * 100) : 0;

    return {
      total,
      activeDoctors: activeDoctors.size,
      draft,
      sent,
      accepted,
      paid,
      rejected,
      amountTotal,
      amountDraft,
      amountSent,
      amountAccepted,
      amountPaid,
      amountRejected,
      rejectionRate,
    };
  }, [consultations]);

  const doctorStats = useMemo(() => {
    const stats = new Map<string, DoctorStats>();

    consultations.forEach((c) => {
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
          amountTotal: 0,
          amountSent: 0,
          amountAccepted: 0,
          amountPaid: 0,
        });
      }

      const row = stats.get(doctorId)!;
      row.total += 1;
      row.amountTotal += amount;

      if (status === "draft") row.draft += 1;
      if (status === "sent") {
        row.sent += 1;
        row.amountSent += amount;
      }
      if (status === "accepted") {
        row.accepted += 1;
        row.amountAccepted += amount;
      }
      if (status === "paid") {
        row.paid += 1;
        row.amountPaid += amount;
      }
      if (status === "rejected") row.rejected += 1;
    });

    return Array.from(stats.values()).sort(
      (a, b) => b.amountTotal - a.amountTotal || b.total - a.total
    );
  }, [consultations, doctorMap]);

  const recentConsultations = useMemo(() => consultations.slice(0, 8), [consultations]);

  const maxStatusValue = useMemo(() => {
    return Math.max(
      metrics.draft,
      metrics.sent,
      metrics.accepted,
      metrics.paid,
      metrics.rejected,
      1
    );
  }, [metrics]);

  const watchItems = useMemo(() => {
    const items: { title: string; value: string; level: "red" | "amber" | "blue" }[] = [];

    if (metrics.draft > 0) {
      items.push({
        title: "Brouillons en attente",
        value: `${metrics.draft} dossier(s) non finalisé(s)`,
        level: metrics.draft >= 20 ? "red" : "amber",
      });
    }

    if (metrics.sent > 0) {
      items.push({
        title: "Dossiers envoyés à suivre",
        value: `${metrics.sent} dossier(s) transmis en attente de suite`,
        level: metrics.sent >= 10 ? "amber" : "blue",
      });
    }

    if (metrics.rejected > 0) {
      items.push({
        title: "Dossiers rejetés",
        value: `${metrics.rejected} rejet(s) sur la période`,
        level: "red",
      });
    }

    if (supportCount > 0) {
      items.push({
        title: "Support à traiter",
        value: `${supportCount} demande(s) ouverte(s)`,
        level: "blue",
      });
    }

    return items.slice(0, 4);
  }, [metrics, supportCount]);

  if (loadingClinic || loading) {
    return <div className="p-6">Chargement du tableau de bord…</div>;
  }

  return (
    <div className="space-y-6">
      {note && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {note}
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-sm text-gray-500">
            Vue d’ensemble de l’activité, des finances et des points de vigilance.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setPeriod("7d")}
            className={`rounded-lg border px-3 py-2 text-sm ${
              period === "7d" ? "bg-gray-900 text-white border-gray-900" : "bg-white"
            }`}
          >
            7 jours
          </button>
          <button
            onClick={() => setPeriod("30d")}
            className={`rounded-lg border px-3 py-2 text-sm ${
              period === "30d" ? "bg-gray-900 text-white border-gray-900" : "bg-white"
            }`}
          >
            30 jours
          </button>
          <button
            onClick={() => setPeriod("month")}
            className={`rounded-lg border px-3 py-2 text-sm ${
              period === "month" ? "bg-gray-900 text-white border-gray-900" : "bg-white"
            }`}
          >
            Mois en cours
          </button>
          <button
            onClick={() => setPeriod("all")}
            className={`rounded-lg border px-3 py-2 text-sm ${
              period === "all" ? "bg-gray-900 text-white border-gray-900" : "bg-white"
            }`}
          >
            Tout
          </button>
        </div>
      </div>

      {/* KPI activité */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Médecins actifs</p>
            <p className="mt-1 text-2xl font-bold">{metrics.activeDoctors}</p>
            <p className="mt-1 text-xs text-gray-400">sur {doctors.length} enregistré(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Consultations</p>
            <p className="mt-1 text-2xl font-bold">{metrics.total}</p>
            <p className="mt-1 text-xs text-gray-400">tous statuts confondus</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Brouillons</p>
            <p className="mt-1 text-2xl font-bold text-slate-700">{metrics.draft}</p>
            <p className="mt-1 text-xs text-gray-400">à finaliser</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Envoyées</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{metrics.sent}</p>
            <p className="mt-1 text-xs text-gray-400">en attente de suite</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Acceptées / Payées</p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {metrics.accepted + metrics.paid}
            </p>
            <p className="mt-1 text-xs text-gray-400">dossiers validés</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Rejets</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{metrics.rejected}</p>
            <p className="mt-1 text-xs text-gray-400">
              taux de rejet : {metrics.rejectionRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cartes financières */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Montant total saisi</p>
            <p className="mt-1 text-2xl font-bold">{formatMoney(metrics.amountTotal)}</p>
            <p className="mt-1 text-xs text-gray-400">activité globale</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Montant en brouillon</p>
            <p className="mt-1 text-2xl font-bold text-slate-700">
              {formatMoney(metrics.amountDraft)}
            </p>
            <p className="mt-1 text-xs text-gray-400">non finalisé</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Montant envoyé</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">
              {formatMoney(metrics.amountSent)}
            </p>
            <p className="mt-1 text-xs text-gray-400">transmis aux assureurs</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Montant accepté</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {formatMoney(metrics.amountAccepted)}
            </p>
            <p className="mt-1 text-xs text-gray-400">validé</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Montant payé</p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {formatMoney(metrics.amountPaid)}
            </p>
            <p className="mt-1 text-xs text-gray-400">encaissé</p>
          </CardContent>
        </Card>
      </div>

      {/* Bloc à surveiller + graphique */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">À surveiller</h2>
              <p className="text-sm text-gray-500">
                Les éléments qui demandent une attention rapide.
              </p>
            </div>

            {watchItems.length === 0 ? (
              <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                Aucun point bloquant détecté sur cette période.
              </div>
            ) : (
              <div className="space-y-3">
                {watchItems.map((item, index) => {
                  const levelClass =
                    item.level === "red"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : item.level === "amber"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-blue-200 bg-blue-50 text-blue-700";

                  return (
                    <div
                      key={`${item.title}-${index}`}
                      className={`rounded-lg border px-4 py-3 ${levelClass}`}
                    >
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm opacity-90">{item.value}</p>
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
              <h2 className="text-lg font-semibold">Répartition des statuts</h2>
              <p className="text-sm text-gray-500">
                Vue rapide de l’activité sur la période sélectionnée.
              </p>
            </div>

            <div className="space-y-4">
              <Bar
                label="Brouillons"
                value={metrics.draft}
                max={maxStatusValue}
                colorClass="bg-slate-500"
              />
              <Bar
                label="Envoyées"
                value={metrics.sent}
                max={maxStatusValue}
                colorClass="bg-amber-500"
              />
              <Bar
                label="Acceptées"
                value={metrics.accepted}
                max={maxStatusValue}
                colorClass="bg-blue-500"
              />
              <Bar
                label="Payées"
                value={metrics.paid}
                max={maxStatusValue}
                colorClass="bg-green-500"
              />
              <Bar
                label="Rejetées"
                value={metrics.rejected}
                max={maxStatusValue}
                colorClass="bg-red-500"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance médecins */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Performance des médecins</h2>
            <p className="text-sm text-gray-500">
              Lecture synthétique par praticien.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-4">Médecin</th>
                  <th className="py-2 pr-4">Consultations</th>
                  <th className="py-2 pr-4">Envoyées</th>
                  <th className="py-2 pr-4">Acceptées</th>
                  <th className="py-2 pr-4">Payées</th>
                  <th className="py-2 pr-4">Rejetées</th>
                  <th className="py-2 pr-4">Montant total</th>
                  <th className="py-2 pr-4">Montant payé</th>
                </tr>
              </thead>
              <tbody>
                {doctorStats.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-gray-400">
                      Aucune donnée disponible.
                    </td>
                  </tr>
                ) : (
                  doctorStats.map((row) => (
                    <tr key={row.doctorId} className="border-b last:border-b-0">
                      <td className="py-3 pr-4 font-medium">{row.doctorName}</td>
                      <td className="py-3 pr-4">{row.total}</td>
                      <td className="py-3 pr-4 text-amber-700">{row.sent}</td>
                      <td className="py-3 pr-4 text-blue-700">{row.accepted}</td>
                      <td className="py-3 pr-4 text-green-700">{row.paid}</td>
                      <td className="py-3 pr-4 text-red-700">{row.rejected}</td>
                      <td className="py-3 pr-4">{formatMoney(row.amountTotal)}</td>
                      <td className="py-3 pr-4 text-green-700">{formatMoney(row.amountPaid)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Activité récente */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Activité récente</h2>
              <p className="text-sm text-gray-500">
                Les derniers dossiers enregistrés.
              </p>
            </div>
            <span className="text-sm text-gray-400">
              {recentConsultations.length} affiché(s)
            </span>
          </div>

          {recentConsultations.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune consultation récente.</p>
          ) : (
            <div className="space-y-3">
              {recentConsultations.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col gap-3 rounded-xl border bg-white px-4 py-3 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">
                      {doctorMap.get(c.doctor_id ?? "") || "Médecin inconnu"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Patient : {c.patient_id || "-"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {c.created_at
                        ? new Date(c.created_at).toLocaleString("fr-FR")
                        : "-"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusPillClass(
                        c.status
                      )}`}
                    >
                      {statusLabel(c.status)}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {formatMoney(Number(c.amount) || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}