// src/pages/assureur/PaiementsPage.tsx
import { useEffect, useState } from "react";
import { Card } from "../../components/ui/card";
import { supabase } from "../../lib/supabaseClient";

type PaymentBatch = {
  id: string;
  created_at: string;
  total_amount: number;
  status: "pending" | "paid";
};

export default function PaiementsPage() {
  const [batches, setBatches] = useState<PaymentBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBatches = async () => {
      const { data, error } = await supabase.from("payment_batches").select("*").order("created_at", { ascending: false });
      if (error) {
        console.error("Erreur chargement des paiements :", error.message);
      } else {
        setBatches(data || []);
      }
      setLoading(false);
    };

    fetchBatches();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Historique des Paiements</h2>

      {loading ? (
        <p>Chargement...</p>
      ) : batches.length === 0 ? (
        <p>Aucun paiement enregistré.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {batches.map((batch) => (
            <Card key={batch.id} className="p-4">
              <p className="text-lg font-semibold">Lot #{batch.id.slice(0, 8)}</p>
              <p>Date : {new Date(batch.created_at).toLocaleDateString()}</p>
              <p>Total : {batch.total_amount.toLocaleString()} FCFA</p>
              <p className={`mt-2 font-medium ${batch.status === "paid" ? "text-green-600" : "text-yellow-600"}`}>
                Statut : {batch.status === "paid" ? "Payé" : "En attente"}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
