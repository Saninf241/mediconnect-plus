import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type KPIs = {
  today: number;
  pending_rights: number;
  validated: number;
  revenue_today: number;
};

export default function DoctorDashboardPage() {
  const [kpis, setKpis] = useState<KPIs>({
    today: 0, pending_rights: 0, validated: 0, revenue_today: 0
  });

  useEffect(() => {
    (async () => {
      // ⚠️ Simplifié : adapte filtres (doctor_id/clinic_id/date) selon ton contexte
      const todayStr = new Date().toISOString().slice(0,10);

      const [{ count: cToday }, { count: cPending }, { count: cValidated }, { data: rev }] = await Promise.all([
        supabase.from("consultations").select("*", { count: "exact", head: true })
          .gte("created_at", `${todayStr} 00:00:00`).lte("created_at", `${todayStr} 23:59:59`),

        supabase.from("consultations").select("*", { count: "exact", head: true })
          .eq("status", "pending_rights"),

        supabase.from("consultations").select("*", { count: "exact", head: true })
          .eq("status", "validated"),

        supabase.rpc("sum_amount_today") // si tu crées une RPC, sinon laisse 0
      ]);

      setKpis({
        today: cToday ?? 0,
        pending_rights: cPending ?? 0,
        validated: cValidated ?? 0,
        revenue_today: (rev as any)?.sum ?? 0
      });
    })();
  }, []);

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
    </div>
  );
}
