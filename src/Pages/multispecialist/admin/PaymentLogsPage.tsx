// src/pages/multispecialist/admin/PaymentLogsPage.tsx

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useUser } from "@clerk/clerk-react";

interface PaymentLog {
  id: string;
  consultation_id: string;
  doctor_name: string;
  amount: number;
  status: string;
  comment: string;
  validated_at: string;
}

const PaymentLogsPage = () => {
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const { user } = useUser();

  useEffect(() => {
    if (user?.id) fetchLogs();
  }, [user]);

  const fetchLogs = async () => {
    const { data: staffData } = await supabase
      .from("clinic_staff")
      .select("clinic_id")
      .eq("id", user?.id)
      .single();

    const clinicId = staffData?.clinic_id;
    if (!clinicId) return;

    const { data, error } = await supabase
      .from("payment_logs")
      .select("id, consultation_id, doctor_name, amount, status, comment, validated_at")
      .eq("clinic_id", clinicId)
      .order("validated_at", { ascending: false });

    if (!error && data) setLogs(data);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Historique des validations</h2>

      <table className="w-full text-sm bg-white shadow rounded">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-3">Médecin</th>
            <th className="p-3">Montant</th>
            <th className="p-3">Statut</th>
            <th className="p-3">Date</th>
            <th className="p-3">Commentaire</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t">
              <td className="p-3">{log.doctor_name}</td>
              <td className="p-3">{log.amount.toLocaleString()} FCFA</td>
              <td className="p-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    log.status === "validé"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {log.status}
                </span>
              </td>
              <td className="p-3">
                {new Date(log.validated_at).toLocaleString()}
              </td>
              <td className="p-3 text-gray-600 italic">{log.comment || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {logs.length === 0 && (
        <p className="mt-4 text-gray-500">Aucune validation enregistrée.</p>
      )}
    </div>
  );
};

export default PaymentLogsPage;
