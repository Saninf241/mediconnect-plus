// src/Pages/multispecialist/admin/AdminAlertsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useClinicId } from "../../../hooks/useClinicId";
import { Card, CardContent } from "../../../components/ui/card";

type PeriodFilter = "all" | "7d" | "30d" | "month";
type AlertTypeFilter =
  | "all"
  | "draft"
  | "sent"
  | "rejected"
  | "doctor_draft"
  | "doctor_rejected"
  | "support";

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

interface AlertItem {
  id: string;
  type: AlertTypeFilter | "global";
  level: "red" | "amber" | "blue";
  title: string;
  description: string;
  count?: number;
  amount?: number;
  doctorId?: string;
  doctorName?: string;
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

function alertClass(level: "red" | "amber" | "blue") {
  if (level === "red") return "border-red-200 bg-red-50 text-red-700";
  if (level === "amber") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

export default function AdminAlertsPage() {
  const { clinicId, loadingClinic } = useClinicId();

  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");
  const [alertTypeFilter, setAlertTypeFilter] = useState<AlertTypeFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [staffRows, setStaffRows] = useState<StaffRow[]>([]);
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [supportCount, setSupportCount] = useState(0);

  useEffect(() => {
    if (loadingClinic) return;

    const fetchData = async () => {
      setLoading(true);
      setNote(null);

      try {
        if (!clinicId) {
          setNote("Impossible de charger les alertes pour cet établissement.");
          setLoading(false);
          return;
        }

        const startDate = getStartDate(periodFilter);

        const staffRes = await supabase
          .from("clinic_staff")
          .select("id, name, role")
          .eq("clinic_id", clinicId);

        if (staffRes.error) {
          console.error("[AdminAlertsPage] clinic_staff error:", staffRes.error);
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
          console.error("[AdminAlertsPage] consultations error:", consultationsRes.error);
          setConsultations([]);
          setNote("Erreur lors du chargement des dossiers.");
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
        console.error("[AdminAlertsPage] unexpected error:", error);
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

  const alerts = useMemo(() => {
    const items: AlertItem[] = [];

    const drafts = consultations.filter((c) => (c.status ?? "").toLowerCase() === "draft");
    const sent = consultations.filter((c) => (c.status ?? "").toLowerCase() === "sent");
    const rejected = consultations.filter((c) => (c.status ?? "").toLowerCase() === "rejected");

    const draftAmount = drafts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const sentAmount = sent.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const rejectedAmount = rejected.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    if (drafts.length > 0) {
      items.push({
        id: "global-drafts",
        type: "draft",
        level: drafts.length >= 20 ? "red" : "amber",
        title: "Volume de brouillons à surveiller",
        description: `${drafts.length} dossier(s) encore en brouillon pour ${formatMoney(draftAmount)}.`,
        count: drafts.length,
        amount: draftAmount,
      });
    }

    if (sent.length > 0) {
      items.push({
        id: "global-sent",
        type: "sent",
        level: sent.length >= 10 ? "amber" : "blue",
        title: "Dossiers envoyés non finalisés",
        description: `${sent.length} dossier(s) transmis en attente de traitement pour ${formatMoney(sentAmount)}.`,
        count: sent.length,
        amount: sentAmount,
      });
    }

    if (rejected.length > 0) {
      items.push({
        id: "global-rejected",
        type: "rejected",
        level: "red",
        title: "Dossiers rejetés",
        description: `${rejected.length} dossier(s) rejetés sur la période pour ${formatMoney(rejectedAmount)}.`,
        count: rejected.length,
        amount: rejectedAmount,
      });
    }

    if (supportCount > 0) {
      items.push({
        id: "support-open",
        type: "support",
        level: "blue",
        title: "Demandes de support ouvertes",
        description: `${supportCount} demande(s) de support nécessitent une attention.`,
        count: supportCount,
      });
    }

    doctors.forEach((doctor) => {
      const doctorConsultations = consultations.filter((c) => c.doctor_id === doctor.id);
      const doctorDrafts = doctorConsultations.filter(
        (c) => (c.status ?? "").toLowerCase() === "draft"
      );
      const doctorRejected = doctorConsultations.filter(
        (c) => (c.status ?? "").toLowerCase() === "rejected"
      );

      const draftCount = doctorDrafts.length;
      const rejectedCount = doctorRejected.length;

      const draftAmountDoctor = doctorDrafts.reduce(
        (sum, c) => sum + (Number(c.amount) || 0),
        0
      );
      const rejectedAmountDoctor = doctorRejected.reduce(
        (sum, c) => sum + (Number(c.amount) || 0),
        0
      );

      if (draftCount >= 5) {
        items.push({
          id: `doctor-draft-${doctor.id}`,
          type: "doctor_draft",
          level: draftCount >= 10 ? "red" : "amber",
          title: `Brouillons élevés – ${doctor.name || "Médecin"}`,
          description: `${draftCount} brouillon(s) pour ${formatMoney(draftAmountDoctor)}.`,
          count: draftCount,
          amount: draftAmountDoctor,
          doctorId: doctor.id,
          doctorName: doctor.name || "Médecin",
        });
      }

      if (rejectedCount >= 2) {
        items.push({
          id: `doctor-rejected-${doctor.id}`,
          type: "doctor_rejected",
          level: "red",
          title: `Rejets à analyser – ${doctor.name || "Médecin"}`,
          description: `${rejectedCount} rejet(s) pour ${formatMoney(rejectedAmountDoctor)}.`,
          count: rejectedCount,
          amount: rejectedAmountDoctor,
          doctorId: doctor.id,
          doctorName: doctor.name || "Médecin",
        });
      }
    });

    return items.sort((a, b) => {
      const priority = { red: 3, amber: 2, blue: 1 };
      return priority[b.level] - priority[a.level];
    });
  }, [consultations, doctors, supportCount]);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (alertTypeFilter !== "all" && alert.type !== alertTypeFilter) return false;

      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;

      return (
        alert.title.toLowerCase().includes(q) ||
        alert.description.toLowerCase().includes(q) ||
        (alert.doctorName ?? "").toLowerCase().includes(q)
      );
    });
  }, [alerts, alertTypeFilter, searchTerm]);

  const rejectedConsultations = useMemo(() => {
    return consultations
      .filter((c) => (c.status ?? "").toLowerCase() === "rejected")
      .slice(0, 8);
  }, [consultations]);

  const sentConsultations = useMemo(() => {
    return consultations
      .filter((c) => (c.status ?? "").toLowerCase() === "sent")
      .slice(0, 8);
  }, [consultations]);

  const summary = useMemo(() => {
    return {
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter((a) => a.level === "red").length,
      warningAlerts: alerts.filter((a) => a.level === "amber").length,
      infoAlerts: alerts.filter((a) => a.level === "blue").length,
    };
  }, [alerts]);

  if (loadingClinic || loading) {
    return <div className="p-6">Chargement des alertes…</div>;
  }

  return (
    <div className="space-y-6">
      {note && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {note}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Alertes à surveiller</h1>
        <p className="text-sm text-gray-500">
          Vue priorisée des dossiers et situations qui demandent une attention.
        </p>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Alertes totales</p>
            <p className="mt-1 text-2xl font-bold">{summary.totalAlerts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Critiques</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{summary.criticalAlerts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">À surveiller</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{summary.warningAlerts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Information</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{summary.infoAlerts}</p>
          </CardContent>
        </Card>
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
              <label className="text-sm font-medium text-gray-700">Type d’alerte</label>
              <select
                value={alertTypeFilter}
                onChange={(e) => setAlertTypeFilter(e.target.value as AlertTypeFilter)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="all">Toutes</option>
                <option value="draft">Brouillons</option>
                <option value="sent">Envoyées en attente</option>
                <option value="rejected">Rejets</option>
                <option value="doctor_draft">Brouillons par médecin</option>
                <option value="doctor_rejected">Rejets par médecin</option>
                <option value="support">Support</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Recherche</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Titre, médecin, description..."
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste principale des alertes */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Alertes détectées</h2>
              <p className="text-sm text-gray-500">
                Priorisées par niveau d’importance.
              </p>
            </div>
            <span className="text-sm text-gray-400">
              {filteredAlerts.length} alerte(s)
            </span>
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
              Aucune alerte pour les filtres sélectionnés.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-xl border px-4 py-4 ${alertClass(alert.level)}`}
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold">{alert.title}</p>
                      <p className="text-sm opacity-90">{alert.description}</p>
                    </div>

                    <div className="text-sm md:text-right">
                      {typeof alert.count === "number" && (
                        <p className="font-medium">{alert.count} élément(s)</p>
                      )}
                      {typeof alert.amount === "number" && (
                        <p className="opacity-90">{formatMoney(alert.amount)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dossiers concrets à regarder */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Rejets récents</h2>
              <p className="text-sm text-gray-500">
                Les derniers dossiers rejetés à analyser.
              </p>
            </div>

            {rejectedConsultations.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun rejet récent.</p>
            ) : (
              <div className="space-y-3">
                {rejectedConsultations.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium text-red-800">
                          {doctorMap.get(c.doctor_id ?? "") || "Médecin inconnu"}
                        </p>
                        <p className="text-sm text-red-700">
                          Patient : {c.patient_id || "-"}
                        </p>
                        <p className="text-xs text-red-600">
                          {c.created_at
                            ? new Date(c.created_at).toLocaleString("fr-FR")
                            : "-"}
                        </p>
                      </div>

                      <div className="text-sm md:text-right">
                        <p className="font-semibold text-red-800">
                          {formatMoney(Number(c.amount) || 0)}
                        </p>
                        <p className="text-xs text-red-600">{statusLabel(c.status)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Envoyées en attente</h2>
              <p className="text-sm text-gray-500">
                Les derniers dossiers transmis qui restent à suivre.
              </p>
            </div>

            {sentConsultations.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun dossier en attente.</p>
            ) : (
              <div className="space-y-3">
                {sentConsultations.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium text-amber-800">
                          {doctorMap.get(c.doctor_id ?? "") || "Médecin inconnu"}
                        </p>
                        <p className="text-sm text-amber-700">
                          Patient : {c.patient_id || "-"}
                        </p>
                        <p className="text-xs text-amber-600">
                          {c.created_at
                            ? new Date(c.created_at).toLocaleString("fr-FR")
                            : "-"}
                        </p>
                      </div>

                      <div className="text-sm md:text-right">
                        <p className="font-semibold text-amber-800">
                          {formatMoney(Number(c.amount) || 0)}
                        </p>
                        <p className="text-xs text-amber-600">{statusLabel(c.status)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}