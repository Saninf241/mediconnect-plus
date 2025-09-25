import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useUser } from "@clerk/clerk-react";

export default function RecusPharmaciePage() {
  const { user } = useUser();
  const [receipts, setReceipts] = useState<any[]>([]);

  useEffect(() => {
    const fetchReceipts = async () => {
      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .select("id")
        .eq("email", user?.primaryEmailAddress?.emailAddress)
        .single();

      if (!patient || patientError) return;

      const { data, error } = await supabase
        .from("pharmacy_receipts")
        .select("*")
        .eq("patient_id", patient.id)
        .order("receipt_date", { ascending: false });

      if (!error && data) setReceipts(data);
    };

    fetchReceipts();
  }, [user]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">🧾 Mes reçus pharmacie</h1>

      {receipts.length === 0 ? (
        <p>Aucun reçu enregistré.</p>
      ) : (
        <ul className="space-y-4">
          {receipts.map((receipt) => (
            <li key={receipt.id} className="border p-4 rounded bg-white shadow">
              <p><strong>Pharmacie :</strong> {receipt.pharmacy_name}</p>
              <p><strong>Date :</strong> {new Date(receipt.receipt_date).toLocaleDateString()}</p>
              <p><strong>Montant :</strong> {receipt.total_amount} FCFA</p>
              {receipt.items && (
                <div className="mt-2">
                  <strong>Produits :</strong>
                  <ul className="list-disc list-inside">
                    {Object.entries(receipt.items).map(([key, value]: any) => (
                      <li key={key}>
                        {value.name} – {value.quantity} x {value.unit_price} FCFA
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
