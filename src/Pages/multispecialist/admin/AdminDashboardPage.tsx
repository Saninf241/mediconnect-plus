// src/pages/multispecialist/admin/AdminDashboardPage.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Card, CardContent } from "../../../components/ui/card";
import { useClinicId } from "../../../hooks/useClinicId";

type PeriodKey = "7d" | "30d" | "month";

interface ConsultationRow {
  id: string;
  doctor_id: string | null;
  amount: number | null;
  status: string | null;
  created_at: string | null;
  payment_date?: string | null;
  anomaly?: boolean | null;
  patients?: {
    id: string;
    is_assured?: boolean | null;
  } | {
    id: string;
    is_assured?: boolean | null;
  }[] | null;
}

interface StaffRow {
  id: string;
  name: string | null;
  role: string | null;
}

interface DoctorPerf {
  doctor_id: string;
  doctor_name: string;
  consultations: number;
  sentCount: number;
  acceptedCount: number;
  paidCount: number;
  rejectedCount: number;
  totalAmount: number;
  paidAmount: number;
  assuredAmount: number;
}

interface DashboardMetrics {
  totalDoctors: number;
  activeDoctors: number;
  consultationsCount: number;
  sentCount: number;
  acceptedCount: number;
  paidCount: number;
  rejectedCount: number;
  anomalyCount: number;
  totalAmount: number;
  acceptedAmount: number;
  paidAmount: number;
  assuredAmount: number;
  openSupportCount: number;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  accepted: "Acceptée",
  paid: "Payée",
  rejected: "Rejetée",
};

function getStartDate(period: PeriodKey) {
  const now = new Date();

  if (period === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }

  if (period === "30d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d.toISOString();
  }

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return monthStart.toISOString();
}

function formatMoney(value: number) {
  return `${value.toLocaleString("fr-FR")} FCFA`;
}

function getPatientOne(patientField: ConsultationRow["patients"]) {
  if (Array.isArray(patientField)) return patientField[0] ?? null;
  return patientField ?? null;
}

export default function AdminDashboardPage() {
  const { clinicId, loadingClinic } = useClinicId();

  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalDoctors: 0,
    activeDoctors: 0,
    consultationsCount: 0,
    sentCount: 0,
    acceptedCount: 0,
    paidCount: 0,
    rejectedCount: 0,
    anomalyCount: 0,
    totalAmount: 0,
    acceptedAmount: 0,
    paidAmount: 0,
    assuredAmount: 0,
    openSupportCount: 0,
  });

  const [doctorPerf, setDoctorPerf] = useState<DoctorPerf[]>([]);
  const [recentConsultations, setRecentConsultations] = useState<ConsultationRow[]>([]);

  const startDate = useMemo(() => getStartDate(period), [period]);

  useEffect(() => {
    if (loadingClinic) return;
    if (!clinicId) {
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      setLoading(true);
      setNote(null);

      try {
        // 1) Staff du cabinet / clinique
        const staffRes = await supabase
          .from("clinic_staff")
          .select("id, name, role")
          .eq("clinic_id", clinicId);

        if (staffRes.error) {
          console.error("[AdminDashboard] clinic_staff error:", staffRes.error);
          setNote("Impossible de charger les membres du cabinet.");
          setLoading(false);
          return;
        }

        const staffRows = (staffRes.data ?? []) as StaffRow[];
        const doctorRows = staffRows.filter(
          (r) => (r.role ?? "").toLowerCase().trim() === "doctor"
        );

        const doctorNameMap = new Map<string, string>();
        doctorRows.forEach((doc) => {
          if (doc.id) doctorNameMap.set(doc.id, doc.name ?? "Médecin");
        });

        if (staffRows.length === 0) {
          setNote("Aucun membre visible dans clinic_staff. Vérifie le scope clinic_id et les règles RLS.");
        }

        // 2) Consultations sur la période
        const consultationsRes = await supabase
          .from("consultations")
          .select(`
            id,
            doctor_id,
            amount,
            status,
            created_at,
            payment_date,
            anomaly,
            patients (
              id,
              is_assured
            )
          `)
          .eq("clinic_id", clinicId)
          .gte("created_at", startDate)
          .order("created_at", { ascending: false });

        if (consultationsRes.error) {
          console.error("[AdminDashboard] consultations error:", consultationsRes.error);
          setNote("Impossible de charger les consultations.");
          setLoading(false);
          return;
        }

        const consultations = (consultationsRes.data ?? []) as ConsultationRow[];

        // 3) Support ouvert
        const supportRes = await supabase
          .from("support_messages")
          .select("id")
          .eq("clinic_id", clinicId)
          .eq("status", "open");

        const openSupportCount = supportRes.error ? 0 : (supportRes.data?.length ?? 0);

        // 4) Calculs dashboard
        let consultationsCount = 0;
        let sentCount = 0;
        let acceptedCount = 0;
        let paidCount = 0;
        let rejectedCount = 0;
        let anomalyCount = 0;

        let totalAmount = 0;
        let acceptedAmount = 0;
        let paidAmount = 0;
        let assuredAmount = 0;

        const activeDoctorIds = new Set<string>();
        const perfMap: Record<string, DoctorPerf> = {};

        for (const c of consultations) {
          const status = (c.status ?? "").toLowerCase().trim();
          const amount = Number(c.amount) || 0;
          const patient = getPatientOne(c.patients);
          const isAssured = !!patient?.is_assured;
          const doctorId = c.doctor_id ?? "unknown-doctor";

          // On compte toute consultation métier hors brouillon
          if (status !== "draft") {
            consultationsCount += 1;
            totalAmount += amount;
            if (c.doctor_id) activeDoctorIds.add(c.doctor_id);
          }

          if (status === "sent") sentCount += 1;
          if (status === "accepted") {
            acceptedCount += 1;
            acceptedAmount += amount;
          }
          if (status === "paid") {
            paidCount += 1;
            paidAmount += amount;
          }
          if (status === "rejected") rejectedCount += 1;

          if (c.anomaly) anomalyCount += 1;
          if (isAssured) assuredAmount += amount;

          if (!perfMap[doctorId]) {
            perfMap[doctorId] = {
              doctor_id: doctorId,
              doctor_name: doctorNameMap.get(doctorId) ?? "Médecin inconnu",
              consultations: 0,
              sentCount: 0,
              acceptedCount: 0,
              paidCount: 0,
              rejectedCount: 0,
              totalAmount: 0,
              paidAmount: 0,
              assuredAmount: 0,
            };
          }

          if (status !== "draft") {
            perfMap[doctorId].consultations += 1;
            perfMap[doctorId].totalAmount += amount;
            if (isAssured) perfMap[doctorId].assuredAmount += amount;
          }

          if (status === "sent") perfMap[doctorId].sentCount += 1;
          if (status === "accepted") perfMap[doctorId].acceptedCount += 1;
          if (status === "paid") {
            perfMap[doctorId].paidCount += 1;
            perfMap[doctorId].paidAmount += amount;
          }
          if (status === "rejected") perfMap[doctorId].rejectedCount += 1;
        }

        const perfArray = Object.values(perfMap).sort((a, b) => {
          if (b.totalAmount !== a.totalAmount) return b.totalAmount - a.totalAmount;
          return b.consultations - a.consultations;
        });

        setMetrics({
          totalDoctors: doctorRows.length,
          activeDoctors: activeDoctorIds.size,
          consultationsCount,
          sentCount,
          acceptedCount,
          paidCount,
          rejectedCount,
          anomalyCount,
          totalAmount,
          acceptedAmount,
          paidAmount,
          assuredAmount,
          openSupportCount,
        });

        setDoctorPerf(perfArray);
        setRecentConsultations(consultations.slice(0, 8));
      } catch (error) {
        console.error("[AdminDashboard] unexpected error:", error);
        setNote("Une erreur inattendue est survenue.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [clinicId, loadingClinic, startDate]);

  if (loadingClinic || loading) {
    return <div className="p-6">Chargement du tableau de bord…</div>;
  }

  const rejectionRate =
    metrics.consultationsCount > 0
      ? Math.round((metrics.rejectedCount / metrics.consultationsCount) * 100)
      : 0;

  return (
    <div className="p-6 space-y-6">
      {note && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {note}
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tableau de bord – Direction</h1>
          <p className="text-sm text-gray-500">
            Vue synthétique de l’activité du cabinet / de la clinique
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setPeriod("7d")}
            className={`rounded-lg px-3 py-2 text-sm border ${
              period === "7d" ? "bg-black text-white border-black" : "bg-white"
            }`}
          >
            7 jours
          </button>
          <button
            onClick={() => setPeriod("30d")}
            className={`rounded-lg px-3 py-2 text-sm border ${
              period === "30d" ? "bg-black text-white border-black" : "bg-white"
            }`}
          >
            30 jours
          </button>
          <button
            onClick={() => setPeriod("month")}
            className={`rounded-lg px-3 py-2 text-sm border ${
              period === "month" ? "bg-black text-white border-black" : "bg-white"
            }`}
          >
            Mois en cours
          </button>
        </div>
      </div>

      {/* KPI principaux */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Médecins enregistrés</p>
            <p className="text-3xl font-bold">{metrics.totalDoctors}</p>
            <p className="text-xs text-gray-400 mt-1">
              {metrics.activeDoctors} actifs sur la période
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Consultations</p>
            <p className="text-3xl font-bold">{metrics.consultationsCount}</p>
            <p className="text-xs text-gray-400 mt-1">
              Hors brouillons
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">En attente assureur</p>
            <p className="text-3xl font-bold text-amber-600">{metrics.sentCount}</p>
            <p className="text-xs text-gray-400 mt-1">
              Dossiers transmis non finalisés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Acceptées</p>
            <p className="text-3xl font-bold text-blue-600">{metrics.acceptedCount}</p>
            <p className="text-xs text-gray-400 mt-1">
              Validées par l’assureur
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Payées</p>
            <p className="text-3xl font-bold text-green-600">{metrics.paidCount}</p>
            <p className="text-xs text-gray-400 mt-1">
              Encaissements confirmés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Rejetées</p>
            <p className="text-3xl font-bold text-red-600">{metrics.rejectedCount}</p>
            <p className="text-xs text-gray-400 mt-1">
              Taux de rejet : {rejectionRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bloc financier */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Montant produit</p>
            <p className="text-2xl font-bold">{formatMoney(metrics.totalAmount)}</p>
            <p className="text-xs text-gray-400 mt-1">
              Tous les dossiers hors brouillons
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Montant accepté</p>
            <p className="text-2xl font-bold text-blue-600">{formatMoney(metrics.acceptedAmount)}</p>
            <p className="text-xs text-gray-400 mt-1">
              Dossiers validés mais pas forcément payés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Montant payé</p>
            <p className="text-2xl font-bold text-green-600">{formatMoney(metrics.paidAmount)}</p>
            <p className="text-xs text-gray-400 mt-1">
              Trésorerie réellement encaissée
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Montant patients assurés</p>
            <p className="text-2xl font-bold text-emerald-600">{formatMoney(metrics.assuredAmount)}</p>
            <p className="text-xs text-gray-400 mt-1">
              Volume lié aux assurés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertes */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Anomalies détectées</p>
            <p className="text-3xl font-bold text-red-600">{metrics.anomalyCount}</p>
            <p className="text-xs text-gray-400 mt-1">
              À surveiller rapidement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Demandes support ouvertes</p>
            <p className="text-3xl font-bold text-orange-600">{metrics.openSupportCount}</p>
            <p className="text-xs text-gray-400 mt-1">
              Tickets non clôturés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Médecins actifs</p>
            <p className="text-3xl font-bold">{metrics.activeDoctors}</p>
            <p className="text-xs text-gray-400 mt-1">
              Ont généré au moins un dossier sur la période
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance médecins */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Performance des médecins</h2>
            <p className="text-sm text-gray-500">
              Classement par montant généré puis par volume
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
                  <th className="py-2 pr-4">Montant généré</th>
                  <th className="py-2 pr-4">Montant payé</th>
                </tr>
              </thead>
              <tbody>
                {doctorPerf.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-gray-400">
                      Aucune activité sur cette période.
                    </td>
                  </tr>
                ) : (
                  doctorPerf.map((doc) => (
                    <tr key={doc.doctor_id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4 font-medium">{doc.doctor_name}</td>
                      <td className="py-3 pr-4">{doc.consultations}</td>
                      <td className="py-3 pr-4">{doc.sentCount}</td>
                      <td className="py-3 pr-4">{doc.acceptedCount}</td>
                      <td className="py-3 pr-4">{doc.paidCount}</td>
                      <td className="py-3 pr-4 text-red-600">{doc.rejectedCount}</td>
                      <td className="py-3 pr-4">{formatMoney(doc.totalAmount)}</td>
                      <td className="py-3 pr-4 text-green-600">{formatMoney(doc.paidAmount)}</td>
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
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Activité récente</h2>
            <p className="text-sm text-gray-500">
              Dernières consultations enregistrées sur la période
            </p>
          </div>

          <div className="space-y-3">
            {recentConsultations.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune consultation récente.</p>
            ) : (
              recentConsultations.map((c) => {
                const amount = Number(c.amount) || 0;
                const doctorName =
                  (c.doctor_id && doctorPerf.find((d) => d.doctor_id === c.doctor_id)?.doctor_name) ||
                  "Médecin inconnu";

                return (
                  <div
                    key={c.id}
                    className="rounded-lg border px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium">{doctorName}</p>
                      <p className="text-xs text-gray-500">
                        {c.created_at
                          ? new Date(c.created_at).toLocaleString("fr-FR")
                          : "Date inconnue"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">
                        {STATUS_LABELS[(c.status ?? "").toLowerCase()] ?? c.status ?? "Inconnu"}
                      </span>
                      <span className="font-semibold">{formatMoney(amount)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}