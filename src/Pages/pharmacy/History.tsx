import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePharmacyContext } from "../../hooks/usePharmacyContext";

type Delivery = {
  id: string;
  delivered_at: string;
  comment: string | null;
  delivered_items: string[];
  consultations: {
    id: string;
    created_at: string;
    medications: string[] | null;
    patients: { name: string | null } | null;
    clinic_staff: { name: string | null } | null;
  } | null;
};

export default function PharmacyHistory() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const { ctx } = usePharmacyContext();
  const pharmacyId = ctx?.pharmacyId ?? null;

  useEffect(() => {
    if (!pharmacyId) return;

    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("pharmacy_deliveries")
        .select(
          `
          id,
          delivered_at,
          comment,
          delivered_items,
          consultations (
            id,
            created_at,
            medications,
            patients ( name ),
            clinic_staff:clinic_staff!consultations_doctor_id_fkey ( name )
          )
        `
        )
        .eq("pharmacy_id", pharmacyId)
        .order("delivered_at", { ascending: false });

      if (error) {
        console.error("Erreur chargement historique :", error);
        return;
      }

      setDeliveries(data as unknown as Delivery[]);
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
          const doctor = consultation?.clinic_staff;
          const allMeds = consultation?.medications || [];
          const isPartial = delivery.delivered_items.length < allMeds.length;

          return (
            <div key={delivery.id} className="border p-4 mb-4 rounded-md bg-white shadow">
              <p><strong>🧍 Patient :</strong> {patient?.name}</p>
              <p><strong>👨‍⚕️ Médecin :</strong> {doctor?.name}</p>
              <p><strong>📅 Date délivrance :</strong> {new Date(delivery.delivered_at).toLocaleString()}</p>
              {isPartial && (
                <p className="text-amber-700 text-sm font-medium">⚠️ Délivrance partielle</p>
              )}
              {delivery.comment && (
                <p className="italic text-gray-500">{delivery.comment}</p>
              )}
              <ul className="ml-4 list-disc text-sm mt-2">
                {delivery.delivered_items.map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
}
