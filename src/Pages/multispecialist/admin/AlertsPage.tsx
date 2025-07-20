// src/pages/multispecialist/admin/AlertsPage.tsx

import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "../../../lib/supabase";

interface AlertConsultation {
  id: string;
  created_at: string;
  anomaly_reason?: string;
  patients?: { name?: string } | null;
  clinic_staff?: { name?: string } | null;
}

export default function AlertsPage() {
  const { user } = useUser();
  const [alerts, setAlerts] = useState<AlertConsultation[]>([]);

  useEffect(() => {
    if (user?.id) fetchAlerts(user.id);
  }, [user]);

  const fetchAlerts = async (userId: string) => {
    // Récupérer le clinic_id
    const { data: staffData, error: staffError } = await supabase
      .from("clinic_staff")
      .select("clinic_id")
      .eq("user_id", userId)
      .single();

    if (staffError || !staffData?.clinic_id) return;

    const { data, error } = await supabase
      .from("consultations")
      .select("id, created_at, anomaly_reason, patients(name), clinic_staff(name)")
      .eq("clinic_id", staffData.clinic_id)
      .eq("anomaly", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Adaptation des types si patients et clinic_staff sont des tableaux
      const parsed = data.map((item: any) => ({
        ...item,
        patients: item.patients?.[0] ?? null,
        clinic_staff: item.clinic_staff?.[0] ?? null,
      }));

      setAlerts(parsed);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Alertes et anomalies</h2>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Patient</th>
              <th className="p-3">Médecin</th>
              <th className="p-3">Motif</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((item) => (
              <tr key={item.id} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  {new Date(item.created_at).toLocaleDateString("fr-FR")}
                </td>
                <td className="p-3">{item.patients?.name || "—"}</td>
                <td className="p-3">{item.clinic_staff?.name || "—"}</td>
                <td className="p-3 text-red-600 font-medium">
                  {item.anomaly_reason || "Anomalie non précisée"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {alerts.length === 0 && (
        <p className="mt-4 text-gray-500">Aucune anomalie détectée pour l’instant.</p>
      )}
    </div>
  );
}
