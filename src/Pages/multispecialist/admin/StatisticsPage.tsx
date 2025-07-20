// src/pages/multispecialist/admin/StatisticsPage.tsx

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { startOfMonth } from "date-fns";

interface Stats {
  totalConsultations: number;
  totalValidatedAmount: number;
  activeDoctors: number;
  totalRejected: number;
  rejectionRate: number;
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);

      const startDate = startOfMonth(new Date()).toISOString();

      type ConsultationRow = {
        id: string;
        amount: number;
        status: string;
        clinic_staff: { id: string } | null;
        };

        const { data: consultations } = await supabase
        .from("consultations")
        .select("id, amount, status, clinic_staff(id)") as unknown as { data: ConsultationRow[] };

      if (!consultations) return;

      const totalConsultations = consultations.length;
      const validated = consultations.filter(c => c.status === "validé");
      const rejected = consultations.filter(c => c.status === "rejeté");

      const totalValidatedAmount = validated.reduce((sum, c) => sum + (c.amount || 0), 0);
      const activeDoctorIds = new Set(validated.map(c => c.clinic_staff?.id));
      const activeDoctors = activeDoctorIds.size;
      const totalRejected = rejected.length;
      const rejectionRate = totalConsultations > 0
        ? Math.round((totalRejected / totalConsultations) * 100)
        : 0;

      setStats({
        totalConsultations,
        totalValidatedAmount,
        activeDoctors,
        totalRejected,
        rejectionRate
      });

      setLoading(false);
    };

    fetchStats();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Statistiques générales (ce mois)</h2>

      {loading ? (
        <p className="text-gray-500">Chargement...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard label="Consultations ce mois-ci" value={stats?.totalConsultations ?? 0} />
          <StatCard label="Total facturé (FCFA)" value={(stats?.totalValidatedAmount ?? 0).toLocaleString()} />
          <StatCard label="Médecins actifs" value={stats?.activeDoctors ?? 0} />
          <StatCard label="Consultations rejetées" value={stats?.totalRejected ?? 0} />
          <StatCard label="Taux de rejet" value={stats?.rejectionRate + " %"} />
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
