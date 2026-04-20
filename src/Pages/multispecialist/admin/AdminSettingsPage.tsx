// src/pages/multispecialist/admin/StatisticsPage.tsx

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { startOfMonth } from "date-fns";

interface Stats {
  totalConsultations: number;
  totalValidatedAmount: number; // accepted + paid
  activeDoctors: number;        // distinct doctors on accepted + paid
  totalRejected: number;
  rejectionRate: number;        // rejected / total
}

type ConsultationRow = {
  id: string;
  amount: number | null;
  status: "draft" | "sent" | "rejected" | "accepted" | "paid" | string;
  created_at: string;
  clinic_staff: { id: string } | null; // docteur lié via clinic_staff
  clinic_id?: string;
};

export default function StatisticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);

      // 1) Scope cabinet depuis la session établissement
      let clinicId: string | null = null;
      try {
        const raw = localStorage.getItem("establishmentUserSession");
        const session = raw ? JSON.parse(raw) : null;
        clinicId = session?.clinicId ?? null;
      } catch {
        clinicId = null;
      }
      if (!clinicId) {
        setStats({
          totalConsultations: 0,
          totalValidatedAmount: 0,
          activeDoctors: 0,
          totalRejected: 0,
          rejectionRate: 0,
        });
        setLoading(false);
        return;
      }

      // 2) Filtre temporel = depuis début du mois
      const startDate = startOfMonth(new Date()).toISOString();

      // 3) Récupération des consultations du cabinet pour le mois en cours
      const { data, error } = await supabase
        .from("consultations")
        .select(`
          id, amount, status, created_at, clinic_id,
          clinic_staff ( id )
        `)
        .eq("clinic_id", clinicId)
        .gte("created_at", startDate)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur chargement consultations (stats):", error);
        setStats({
          totalConsultations: 0,
          totalValidatedAmount: 0,
          activeDoctors: 0,
          totalRejected: 0,
          rejectionRate: 0,
        });
        setLoading(false);
        return;
      }

      const consultations: ConsultationRow[] = (data || []).map((c: any) => ({
        ...c,
        clinic_staff: Array.isArray(c.clinic_staff) ? c.clinic_staff[0] ?? null : c.clinic_staff ?? null,
      }));

      const totalConsultations = consultations.length;

      // accepted + paid
      const validatedLike = consultations.filter(
        (c) => c.status === "accepted" || c.status === "paid"
      );
      const totalValidatedAmount = validatedLike.reduce(
        (sum, c) => sum + (Number(c.amount) || 0),
        0
      );

      // médecins actifs (sur accepted + paid)
      const activeDoctorIds = new Set(
        validatedLike
          .map((c) => c.clinic_staff?.id)
          .filter((id): id is string => !!id)
      );
      const activeDoctors = activeDoctorIds.size;

      // rejetées
      const totalRejected = consultations.filter((c) => c.status === "rejected").length;

      const rejectionRate =
        totalConsultations > 0
          ? Math.round((totalRejected / totalConsultations) * 100)
          : 0;

      setStats({
        totalConsultations,
        totalValidatedAmount,
        activeDoctors,
        totalRejected,
        rejectionRate,
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Statistiques générales (ce mois)</h2>

      {loading ? (
        <p className="text-gray-500">Chargement…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard label="Consultations ce mois-ci" value={stats?.totalConsultations ?? 0} />
          <StatCard label="Total facturé (accepted + paid)" value={(stats?.totalValidatedAmount ?? 0).toLocaleString() + " FCFA"} />
          <StatCard label="Médecins actifs" value={stats?.activeDoctors ?? 0} />
          <StatCard label="Consultations rejetées" value={stats?.totalRejected ?? 0} />
          <StatCard label="Taux de rejet" value={(stats?.rejectionRate ?? 0) + " %"} />
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
