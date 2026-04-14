// src/Pages/multispecialist/doctor/PerformanceDoctorPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getDoctorPerformance } from "../../../lib/queries/doctors";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  Wallet,
  CalendarClock,
  FileText,
  Clock3,
} from "lucide-react";

type PeriodValue = "30d" | "3m" | "6m" | "12m" | "all";

type ChartPoint = {
  label: string;
  value: number;
};

type StatusCounts = {
  draft?: number;
  sent?: number;
  accepted?: number;
  rejected?: number;
  paid?: number;
};

type PerformanceData = {
  total_consultations?: number;
  total_revenue?: number;
  average_revenue_per_consultation?: number;
  last_consultation_date?: string | null;
  status_counts?: StatusCounts | null;
  activity_series?: ChartPoint[] | null;
};

function formatFCFA(value: number) {
  return `${(value || 0).toLocaleString()} FCFA`;
}

function formatDate(value?: string | null) {
  if (!value) return "Aucune";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Aucune";
  return date.toLocaleDateString("fr-FR");
}

function periodLabel(period: PeriodValue) {
  switch (period) {
    case "30d":
      return "30 derniers jours";
    case "3m":
      return "3 derniers mois";
    case "6m":
      return "6 derniers mois";
    case "12m":
      return "12 derniers mois";
    case "all":
      return "Depuis le début";
    default:
      return "";
  }
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white p-4 shadow-sm rounded-2xl border border-gray-100">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
        </div>
        <div className="p-2 rounded-xl bg-blue-50 text-blue-700">{icon}</div>
      </div>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  );
}

function StatusCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  );
}

export default function PerformanceDoctorPage() {
  const { user } = useUser();
  const [period, setPeriod] = useState<PeriodValue>("6m");
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        if (!user?.id) {
          setLoading(false);
          return;
        }

        setLoading(true);
        const data = await getDoctorPerformance(user.id, period);
        console.log("Performance récupérée :", data);
        setPerformance(data ?? null);
      } catch (error) {
        console.error("Erreur chargement performance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, [user, period]);

  const metrics = useMemo(() => {
    const p = performance || {};

    const totalConsultations = p.total_consultations || 0;
    const totalRevenue = p.total_revenue || 0;
    const avgRevenue =
      p.average_revenue_per_consultation ||
      (totalConsultations > 0 ? totalRevenue / totalConsultations : 0);

    const statusCounts = p.status_counts || {};
    const activitySeries = p.activity_series || [];

    return {
      totalConsultations,
      totalRevenue,
      avgRevenue,
      lastConsultationDate: p.last_consultation_date || null,
      draft: statusCounts.draft || 0,
      sent: statusCounts.sent || 0,
      accepted: statusCounts.accepted || 0,
      rejected: statusCounts.rejected || 0,
      paid: statusCounts.paid || 0,
      activitySeries,
    };
  }, [performance]);

  const quickMessage = useMemo(() => {
    if (metrics.totalConsultations === 0) {
      if (period === "30d") {
        return "Aucune activité sur les 30 derniers jours. Vous pouvez élargir la période pour retrouver votre historique.";
      }
      return "Aucune consultation enregistrée sur cette période.";
    }

    return `Vous avez enregistré ${metrics.totalConsultations} consultation(s) sur la période sélectionnée. Dernière activité : ${formatDate(
      metrics.lastConsultationDate
    )}.`;
  }, [metrics, period]);

  if (loading) {
    return <div className="p-6">Chargement des données de performance...</div>;
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-700">📊 Tableau de performance</h1>
          <p className="text-sm text-gray-500 mt-1">
            Suivez votre activité sur la période choisie.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Période :</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodValue)}
            className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none"
          >
            <option value="30d">30 derniers jours</option>
            <option value="3m">3 derniers mois</option>
            <option value="6m">6 derniers mois</option>
            <option value="12m">12 derniers mois</option>
            <option value="all">Depuis le début</option>
          </select>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <p className="text-sm text-gray-500">Résumé</p>
        <p className="mt-2 text-sm text-gray-700">{quickMessage}</p>
        <p className="mt-2 text-xs text-gray-400">
          Période actuelle : {periodLabel(period)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <KpiCard
          title="Consultations"
          value={metrics.totalConsultations}
          subtitle={`Période : ${periodLabel(period)}`}
          icon={<Activity className="h-5 w-5" />}
        />

        <KpiCard
          title="Montant total"
          value={formatFCFA(metrics.totalRevenue)}
          subtitle="Somme des consultations de la période"
          icon={<Wallet className="h-5 w-5" />}
        />

        <KpiCard
          title="Montant moyen / consultation"
          value={formatFCFA(metrics.avgRevenue)}
          subtitle="Moyenne calculée sur la période"
          icon={<FileText className="h-5 w-5" />}
        />

        <KpiCard
          title="Dernière consultation"
          value={formatDate(metrics.lastConsultationDate)}
          subtitle="Dernière activité enregistrée"
          icon={<CalendarClock className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatusCard label="Brouillons" value={metrics.draft} />
        <StatusCard label="Envoyées" value={metrics.sent} />
        <StatusCard label="Acceptées" value={metrics.accepted} />
        <StatusCard label="Rejetées" value={metrics.rejected} />
        <StatusCard label="Payées" value={metrics.paid} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white shadow-sm p-4 rounded-2xl border border-gray-100">
          <h4 className="text-md font-semibold text-gray-800 mb-3">
            📈 Évolution de l’activité
          </h4>

          {metrics.activitySeries.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-gray-500">
              Aucun historique à afficher sur cette période.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={metrics.activitySeries}>
                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.5} />
                <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock3 className="h-5 w-5 text-amber-500" />
            <h4 className="text-md font-semibold text-gray-800">Lecture rapide</h4>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
              {metrics.totalConsultations > 0
                ? `Vous avez ${metrics.totalConsultations} consultation(s) sur ${periodLabel(period).toLowerCase()}.`
                : "Aucune consultation sur cette période."}
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
              Dernière consultation enregistrée : {formatDate(metrics.lastConsultationDate)}.
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700">
              Montant total sur la période : {formatFCFA(metrics.totalRevenue)}.
            </div>

            {period === "30d" && metrics.totalConsultations === 0 && (
              <div className="rounded-xl border border-gray-100 bg-amber-50 p-3 text-sm text-amber-700">
                Essayez la vue 3 mois, 6 mois ou depuis le début pour visualiser votre historique.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}