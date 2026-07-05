import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { usePharmacyContext } from "../../hooks/usePharmacyContext";

export default function PharmacyDashboard() {
  const [consultations, setConsultations] = useState<any[]>([]);
  const { ctx } = usePharmacyContext();

  useEffect(() => {
    const fetchConsultations = async () => {
      const { data, error } = await supabase
        .from("consultations")
        .select(`
          id,
          created_at,
          status,
          delivered,
          patients (
            id,
            full_name,
            is_assured,
            fingerprint_missing
          ),
          doctors (
            id,
            full_name,
            specialty
          ),
          consultation_medications (
            id,
            medication_name,
            dosage
          )
        `)
        .eq("delivered", false)
        .eq("status", "validated")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur Supabase :", error);
        return;
      }

      setConsultations(data);
    };

    fetchConsultations();
  }, []);

  const handleDeliver = async (consultationId: string) => {
    if (!ctx) {
      alert("Session pharmacien introuvable.");
      return;
    }

    const pharmacyId = ctx.pharmacyId;
    const pharmacistId = ctx.staffId;

    const deliveredAt = new Date().toISOString();

    // 1. Mise à jour de la consultation
    const { error: updateError } = await supabase
      .from("consultations")
      .update({ delivered: true, delivered_at: deliveredAt })
      .eq("id", consultationId);

    if (updateError) {
      alert("❌ Erreur lors de la mise à jour de la consultation.");
      return;
    }

    // 2. Insertion dans pharmacy_deliveries
    const { error: insertError } = await supabase
      .from("pharmacy_deliveries")
      .insert([
        {
          consultation_id: consultationId,
          pharmacy_id: pharmacyId,
          pharmacist_id: pharmacistId,
          delivered_at: deliveredAt
        }
      ]);

    if (insertError) {
      alert("⚠️ Consultation mise à jour, mais erreur lors de l’archivage.");
      console.error("Erreur insert delivery :", insertError);
    } else {
      // 3. Mise à jour locale
      setConsultations((prev) =>
        prev.filter((c) => c.id !== consultationId)
      );
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">📥 Ordonnances à traiter</h1>

      {consultations.length === 0 ? (
        <p>Aucune ordonnance en attente pour le moment.</p>
      ) : (
        consultations.map((consultation) => {
          const patient = consultation.patients;
          const doctor = consultation.doctors;

          const statutAssure = patient?.is_assured ? "✅ Oui" : "❌ Non";
          const statutEmpreinte = patient?.fingerprint_missing
            ? "❌ Absente"
            : "✅ Présente";

          return (
            <div
              key={consultation.id}
              className="border p-4 mb-3 rounded-md bg-gray-50 shadow"
            >
              <p><strong>🧍 Patient :</strong> {patient?.full_name}</p>
              <p><strong>🔐 Assuré :</strong> {statutAssure}</p>
              <p><strong>🧬 Empreinte :</strong> {statutEmpreinte}</p>
              <p><strong>👨‍⚕️ Médecin :</strong> {doctor?.full_name}</p>
              <ul className="ml-4 list-disc text-sm text-gray-700 my-2">
                {consultation.consultation_medications?.map((med: any) => (
                  <li key={med.id}>{med.medication_name} – {med.dosage}</li>
                ))}
              </ul>
              <button
                onClick={() => handleDeliver(consultation.id)}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                ✅ Valider la délivrance
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
