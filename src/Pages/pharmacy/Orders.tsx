// src/Pages/pharmacy/Orders.tsx
//
// File d'attente des ordonnances que le médecin a explicitement associées à
// cette pharmacie (facultatif côté médecin — la plupart des ordonnances
// n'apparaîtront jamais ici et se traitent via la recherche par code sur
// l'accueil). Pratique quand la pharmacie sait à l'avance qu'elle va
// recevoir le patient.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { usePharmacyContext } from "../../hooks/usePharmacyContext";

type QueuedConsultation = {
  id: string;
  created_at: string;
  dispense_code: string | null;
  medications: string[] | null;
  patients: { name: string | null; is_assured: boolean | null } | null;
  clinic_staff: { name: string | null; speciality: string | null } | null;
};

export default function PharmacyOrders() {
  const { ctx, loading: ctxLoading } = usePharmacyContext();
  const [consultations, setConsultations] = useState<QueuedConsultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ctx) return;

    const fetchOrders = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("consultations")
        .select(
          `
          id,
          created_at,
          dispense_code,
          medications,
          patients ( name, is_assured ),
          clinic_staff:clinic_staff!consultations_doctor_id_fkey ( name, speciality )
        `
        )
        .eq("status", "validated")
        .eq("pharmacy_id", ctx.pharmacyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[PharmacyOrders] error:", error);
        setLoading(false);
        return;
      }

      // Exclut celles déjà délivrées.
      const ids = (data || []).map((c) => c.id);
      let deliveredIds = new Set<string>();
      if (ids.length > 0) {
        const { data: deliveries } = await supabase
          .from("pharmacy_deliveries")
          .select("consultation_id")
          .in("consultation_id", ids);
        deliveredIds = new Set((deliveries || []).map((d) => d.consultation_id));
      }

      setConsultations(
        (data as QueuedConsultation[] || []).filter((c) => !deliveredIds.has(c.id))
      );
      setLoading(false);
    };

    fetchOrders();
  }, [ctx]);

  if (ctxLoading || loading) return <p>Chargement…</p>;
  if (!ctx) return <p>Session pharmacien introuvable.</p>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">📥 Ordonnances pré-assignées</h2>
      <p className="text-sm text-gray-500 mb-4">
        Consultations que le médecin a associées à {ctx.pharmacyName}. Pour toute
        autre ordonnance, utilisez la <Link to="/pharmacy" className="underline">recherche par code</Link>.
      </p>

      {consultations.length === 0 ? (
        <p>Aucune ordonnance en attente pour le moment.</p>
      ) : (
        consultations.map((consultation) => {
          const patient = consultation.patients;
          const doctor = consultation.clinic_staff;

          return (
            <div
              key={consultation.id}
              className="bg-gray-100 p-4 rounded mb-3 shadow"
            >
              <p><strong>🧍 Patient :</strong> {patient?.name}</p>
              <p><strong>👨‍⚕️ Médecin :</strong> {doctor?.name} {doctor?.speciality ? `(${doctor.speciality})` : ""}</p>
              <p><strong>📅 Date :</strong> {new Date(consultation.created_at).toLocaleString()}</p>
              <p><strong>🔐 Assuré :</strong> {patient?.is_assured ? "✅ Oui" : "❌ Non"}</p>
              <p><strong>🔑 Code :</strong> <span className="font-mono">{consultation.dispense_code}</span></p>
              <ul className="list-disc ml-6 my-2 text-sm">
                {(consultation.medications || []).map((med, i) => (
                  <li key={i}>{med}</li>
                ))}
              </ul>
              <p className="text-xs text-gray-500">
                Utilisez la recherche par code sur l'accueil pour valider la délivrance.
              </p>
            </div>
          );
        })
      )}
    </div>
  );
}
