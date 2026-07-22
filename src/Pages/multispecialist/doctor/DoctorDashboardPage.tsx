//src/Pages/multispecialist/doctor/DoctorDashboardPage.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useDoctorContext } from "../../../hooks/useDoctorContext";
import TodayAppointmentsCard from "../../../components/ui/TodayAppointmentsCard";

type KPIs = {
  today: number;
  pending_rights: number;
  validated: number;
  revenue_today: number;
};

export default function DoctorDashboardPage() {
  const doctorInfo = useDoctorContext();
  const [kpis, setKpis] = useState<KPIs>({
    today: 0, pending_rights: 0, validated: 0, revenue_today: 0
  });

  useEffect(() => {
    const clinicId = doctorInfo?.clinic_id;
    const doctorId = doctorInfo?.doctor_id;
    if (!clinicId || !doctorId) return;

    (async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const base = () =>
        supabase.from("consultations").select("*", { count: "exact", head: true })
          .eq("clinic_id", clinicId).eq("doctor_id", doctorId);

      const [{ count: cToday, error: eToday }, { count: cPending, error: ePending }, { count: cValidated, error: eValidated }, { data: rev, error: eRev }] = await Promise.all([
        base()
          .gte("created_at", `${todayStr} 00:00:00`).lte("created_at", `${todayStr} 23:59:59`),

        base()
          .eq("status", "pending_rights"),

        base()
          .eq("status", "validated"),

        supabase.from("consultations").select("amount")
          .eq("clinic_id", clinicId).eq("doctor_id", doctorId)
          .gte("created_at", `${todayStr} 00:00:00`).lte("created_at", `${todayStr} 23:59:59`)
      ]);

      if (eToday || ePending || eValidated || eRev) {
        console.error("[DoctorDashboardPage] fetch error:", { eToday, ePending, eValidated, eRev });
      }

      const revenueToday = (rev ?? []).reduce((sum, c: any) => sum + (c.amount || 0), 0);

      setKpis({
        today: cToday ?? 0,
        pending_rights: cPending ?? 0,
        validated: cValidated ?? 0,
        revenue_today: revenueToday
      });
    })();
  }, [doctorInfo]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Bienvenue dans l’espace médecin</h1>
      <p className="text-gray-600">Suivi rapide des activités et validations.</p>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">Consultations du jour</div>
          <div className="text-3xl font-semibold">{kpis.today}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">En attente de droits</div>
          <div className="text-3xl font-semibold">{kpis.pending_rights}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">Validées</div>
          <div className="text-3xl font-semibold">{kpis.validated}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-500">Recettes (jour)</div>
          <div className="text-3xl font-semibold">{kpis.revenue_today.toLocaleString()} FCFA</div>
        </div>
      </div>

      {doctorInfo && (
        <TodayAppointmentsCard clinicId={doctorInfo.clinic_id} doctorId={doctorInfo.doctor_id} />
      )}
    </div>
  );
}
