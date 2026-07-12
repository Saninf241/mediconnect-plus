import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePharmacyContext } from "../../hooks/usePharmacyContext";

export default function PharmacyHistory() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const { ctx } = usePharmacyContext();
  const pharmacyId = ctx?.pharmacyId ?? null;

  useEffect(() => {
    if (!pharmacyId) return;

    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("pharmacy_deliveries")
        .select(`
          id,
          delivered_at,
          comment,
          consultations (
            id,
            created_at,
            patients (
              full_name
            ),
            doctors (
              full_name
            ),
            consultation_medications (
              medication_name,
              dosage
            )
          )
        `)
        .eq("pharmacy_id", pharmacyId)
        .order("delivered_at", { ascending: false });

      if (error) {
        console.error("Erreur chargement historique :", error);
        return;
      }

      setDeliveries(data);
    };

    fetchHistory();
  }, [pharmacyId]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">📜 Historique des délivrances</h1>

      {deliveries.length === 0 ? (
        <p>Aucune délivrance enregistrée.</p>
      ) : (
        deliveries.map((delivery) => {
          const consultation = delivery.consultations;
          const patient = consultation?.patients;
          const doctor = consultation?.doctors;
          const meds = consultation?.consultation_medications || [];

          return (
            <div key={delivery.id} className="border p-4 mb-4 rounded-md bg-white shadow">
              <p><strong>🧍 Patient :</strong> {patient?.full_name}</p>
              <p><strong>👨‍⚕️ Médecin :</strong> {doctor?.full_name}</p>
              <p><strong>📅 Date délivrance :</strong> {new Date(delivery.delivered_at).toLocaleString()}</p>
              <p className="italic text-gray-500">{delivery.comment}</p>
              <ul className="ml-4 list-disc text-sm mt-2">
                {meds.map((m: any, idx: number) => (
                  <li key={idx}>{m.medication_name} – {m.dosage}</li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
}
