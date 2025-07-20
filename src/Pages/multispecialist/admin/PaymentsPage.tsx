// src/pages/multispecialist/admin/PaymentsPage.tsx

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useUser } from "@clerk/clerk-react";

interface Payment {
  id: string;
  amount: number;
  date: string;
  doctor_name: string;
  status: string;
}

const PaymentsPage = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filtered, setFiltered] = useState<Payment[]>([]);
  const [period, setPeriod] = useState("30");
  const { user } = useUser();

  useEffect(() => {
    if (user?.id) fetchPayments();
  }, [user]);

  useEffect(() => {
    filterPayments();
  }, [period, payments]);

  const fetchPayments = async () => {
    const { data: userData } = await supabase
      .from("clinic_staff")
      .select("clinic_id")
      .eq("id", user?.id)
      .single();

    const clinicId = userData?.clinic_id;
    if (!clinicId) return;

    const { data, error } = await supabase
      .from("payments")
      .select("id, amount, date, doctor_name, status")
      .eq("clinic_id", clinicId)
      .order("date", { ascending: false });

    if (!error && data) setPayments(data);
  };

  const filterPayments = () => {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - parseInt(period));

    const filteredData = payments.filter((p) => {
      const paymentDate = new Date(p.date);
      return paymentDate >= cutoff;
    });

    setFiltered(filteredData);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Paiements reçus</h2>

      <div className="flex gap-4 items-center mb-6">
        <label>Période :</label>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="7">7 derniers jours</option>
          <option value="30">30 derniers jours</option>
          <option value="90">90 derniers jours</option>
        </select>
      </div>

      <table className="w-full bg-white shadow rounded">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3">Médecin</th>
            <th className="p-3">Montant</th>
            <th className="p-3">Date</th>
            <th className="p-3">Statut</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => (
            <tr key={p.id} className="border-t text-sm">
              <td className="p-3">{p.doctor_name}</td>
              <td className="p-3">{p.amount.toLocaleString()} FCFA</td>
              <td className="p-3">{new Date(p.date).toLocaleDateString()}</td>
              <td className="p-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    p.status === "validé"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {p.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtered.length === 0 && (
        <p className="mt-4 text-gray-500">Aucun paiement trouvé pour cette période.</p>
      )}
    </div>
  );
};

export default PaymentsPage;
