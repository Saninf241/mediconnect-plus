import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { getDoctorPerformance } from "../../lib/queries/doctors";
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
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock3,
  FileText,
  AlertTriangle,
} from "lucide-react";

type ChartPoint = {
  month: string;
  value: number;
};

type PerformanceData = {
  avg_payment_delay?: number;
  immediate_acceptance_rate?: number;
  current_month_revenue?: number;
  previous_month_revenue?: number;
  monthly_revenues?: ChartPoint[];
  monthly_delays?: ChartPoint[];
  monthly_acceptance_rates?: ChartPoint[];
  total_consultations?: number;
  current_month_consultations?: number;
  previous_month_consultations?: number;
  monthly_consultations?: ChartPoint[];
  rejected_rate?: number;
  current_month_rejected?: number;
  pending_consultations?: number;
  paid_consultations?: number;
  average_revenue_per_consultation?: number;
  anomaly_count?: number;
};

function formatFCFA(value: number) {
  return `${(value || 0).toLocaleString()} FCFA`;
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(0)}%`;
}

function formatDays(value: number) {
  return `${Number(value || 0).toFixed(1)} jours`;
}

function TrendIcon({ current, previous }: { current: number; previous: number }) {
  if (current > previous) {
    return <ArrowUpRight className="inline-block h-4 w-4 text-green-600" />;
  }
  if (current < previous) {
    return <ArrowDownRight className="inline-block h-4 w-4 text-red-600" />;
  }
  return null;
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

function ChartCard({
  title,
  data,
  color,
  yDomain,
}: {
  title: string;
  data: ChartPoint[];
  color: string;
  yDomain?: [number, number];
}) {
  return (
    <div className="bg-white shadow-sm p-4 rounded-2xl border border-gray-100">
      <h4 className="text-md font-semibold text-gray-800 mb-3">{title}</h4>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} />
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <XAxis dataKey="month" />
          <YAxis domain={yDomain} />
          <Tooltip />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function PerformanceDoctorPage() {
  const { user } = useUser();
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        if (!user?.id) {
          setLoading(false);
          return;
        }

        const data = await getDoctorPerformance(user.id);
        console.log("Performance récupérée :", data);
        setPerformance(data ?? null);
      } catch (error) {
        console.error("Erreur chargement performance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, [user]);

  const metrics = useMemo(() => {
    const p = performance || {};

    const currentMonthRevenue = p.current_month_revenue || 0;
    const previousMonthRevenue = p.previous_month_revenue || 0;
    const currentMonthConsultations = p.current_month_consultations || 0;
    const previousMonthConsultations = p.previous_month_consultations || 0;
    const immediateAcceptanceRate = p.immediate_acceptance_rate || 0;
    const rejectedRate = p.rejected_rate || 0;
    const avgPaymentDelay = p.avg_payment_delay || 0;
    const totalConsultations = p.total_consultations || 0;
    const pendingConsultations = p.pending_consultations || 0;
    const paidConsultations = p.paid_consultations || 0;
    const anomalyCount = p.anomaly_count || 0;

    const avgRevenuePerConsultation =
      p.average_revenue_per_consultation ||
      (currentMonthConsultations > 0
        ? currentMonthRevenue / currentMonthConsultations
        : 0);

    return {
      currentMonthRevenue,
      previousMonthRevenue,
      currentMonthConsultations,
      previousMonthConsultations,
      immediateAcceptanceRate,
      rejectedRate,
      avgPaymentDelay,
      totalConsultations,
      pendingConsultations,
      paidConsultations,
      avgRevenuePerConsultation,
      anomalyCount,
      monthlyRevenues: p.monthly_revenues || [],
      monthlyDelays: p.monthly_delays || [],
      monthlyAcceptanceRates: p.monthly_acceptance_rates || [],
      monthlyConsultations: p.monthly_consultations || [],
      currentMonthRejected: p.current_month_rejected || 0,
    };
  }, [performance]);

  const quickAnalysis = useMemo(() => {
    const notes: string[] = [];

    if (metrics.immediateAcceptanceRate >= 90) {
      notes.push("Excellent taux d’acceptation : vos dossiers sont globalement bien préparés.");
    } else if (metrics.immediateAcceptanceRate < 75) {
      notes.push("Le taux d’acceptation est à surveiller : certains dossiers semblent poser problème.");
    }

    if (metrics.avgPaymentDelay > 15) {
      notes.push("Le délai moyen de paiement est élevé : il faudra surveiller les dossiers en attente.");
    }

    if (metrics.currentMonthRevenue > metrics.previousMonthRevenue) {
      notes.push("Vos revenus sont en hausse par rapport au mois précédent.");
    } else if (metrics.currentMonthRevenue < metrics.previousMonthRevenue) {
      notes.push("Vos revenus sont en baisse par rapport au mois précédent.");
    }

    if (metrics.pendingConsultations > 0) {
      notes.push(`${metrics.pendingConsultations} dossier(s) sont encore en attente de traitement ou de paiement.`);
    }

    if (metrics.anomalyCount > 0) {
      notes.push(`${metrics.anomalyCount} anomalie(s) ont été détectée(s) sur vos dossiers.`);
    }

    if (notes.length === 0) {
      notes.push("Vos indicateurs sont stables pour le moment.");
    }

    return notes;
  }, [metrics]);

  if (loading) {
    return <div className="p-6">Chargement des données de performance...</div>;
  }

  if (!performance) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-blue-700 mb-4">📊 Tableau de performance</h1>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-gray-600">
          Aucune donnée de performance disponible pour le moment.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-blue-700">📊 Tableau de performance</h1>
        <p className="text-sm text-gray-500 mt-1">
          Suivez votre activité, vos revenus et la qualité de traitement de vos dossiers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <KpiCard
          title="Consultations ce mois"
          value={
            <>
              {metrics.currentMonthConsultations}{" "}
              <TrendIcon
                current={metrics.currentMonthConsultations}
                previous={metrics.previousMonthConsultations}
              />
            </>
          }
          subtitle={`Mois précédent : ${metrics.previousMonthConsultations}`}
          icon={<Activity className="h-5 w-5" />}
        />

        <KpiCard
          title="Revenus ce mois"
          value={
            <>
              {formatFCFA(metrics.currentMonthRevenue)}{" "}
              <TrendIcon
                current={metrics.currentMonthRevenue}
                previous={metrics.previousMonthRevenue}
              />
            </>
          }
          subtitle={`Mois précédent : ${formatFCFA(metrics.previousMonthRevenue)}`}
          icon={<Wallet className="h-5 w-5" />}
        />

        <KpiCard
          title="Taux d’acceptation"
          value={formatPercent(metrics.immediateAcceptanceRate)}
          subtitle="Objectif recommandé : > 90%"
          icon={<CheckCircle2 className="h-5 w-5" />}
        />

        <KpiCard
          title="Taux de rejet"
          value={formatPercent(metrics.rejectedRate)}
          subtitle={`Dossiers rejetés ce mois : ${metrics.currentMonthRejected}`}
          icon={<XCircle className="h-5 w-5" />}
        />

        <KpiCard
          title="Délai moyen de paiement"
          value={formatDays(metrics.avgPaymentDelay)}
          subtitle="Temps moyen entre validation et paiement"
          icon={<Clock3 className="h-5 w-5" />}
        />

        <KpiCard
          title="Montant moyen / consultation"
          value={formatFCFA(metrics.avgRevenuePerConsultation)}
          subtitle={`Total consultations : ${metrics.totalConsultations}`}
          icon={<FileText className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">Dossiers en attente</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{metrics.pendingConsultations}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">Dossiers payés</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{metrics.paidConsultations}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">Anomalies détectées</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{metrics.anomalyCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <ChartCard title="📈 Revenus mensuels" data={metrics.monthlyRevenues} color="#2563eb" />
        <ChartCard title="📊 Taux d’acceptation" data={metrics.monthlyAcceptanceRates} color="#10b981" yDomain={[0, 100]} />
        <ChartCard title="🩺 Consultations mensuelles" data={metrics.monthlyConsultations} color="#8b5cf6" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard title="⏱️ Délai moyen de paiement" data={metrics.monthlyDelays} color="#f97316" />

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h4 className="text-md font-semibold text-gray-800">Lecture rapide</h4>
          </div>

          <div className="space-y-3">
            {quickAnalysis.map((item, index) => (
              <div
                key={index}
                className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}