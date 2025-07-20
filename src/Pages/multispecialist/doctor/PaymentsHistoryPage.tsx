// src/pages/doctor/PaymentsHistoryPage.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Payment {
  id: string;
  consultation_id: string;
  amount: number;
  status: string;
  rejection_reason?: string;
  created_at: string;
}

export default function PaymentsHistoryPage() {
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    const fetchPayments = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("doctor_id", userId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPayments(data);
      }
    };

    fetchPayments();
  }, []);

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Historique des paiements", 14, 16);

    autoTable(doc, {
      startY: 22,
      head: [["Date", "Consultation", "Montant", "Statut", "Raison du rejet"]],
      body: payments.map((p) => [
        new Date(p.created_at).toLocaleDateString(),
        p.consultation_id,
        `${p.amount} FCFA`,
        p.status,
        p.status === "rejected" ? p.rejection_reason || "—" : "—",
      ]),
    });

    doc.save("historique_paiements.pdf");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Historique des paiements</h1>
        <button
          onClick={exportToPDF}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Exporter en PDF
        </button>
      </div>

      <div className="bg-white rounded shadow p-4">
        {payments.length === 0 ? (
          <p className="text-gray-500">Aucun paiement trouvé.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Date</th>
                <th>Consultation</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Raison du rejet</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td>{p.consultation_id}</td>
                  <td>{p.amount} FCFA</td>
                  <td className="capitalize">{p.status}</td>
                  <td>{p.status === "rejected" ? p.rejection_reason || "—" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
