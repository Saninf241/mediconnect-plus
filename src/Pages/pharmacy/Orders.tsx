//src/pages/pharmacy/Orders.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function PharmacyOrders() {
  const [consultations, setConsultations] = useState<any[]>([]);

  useEffect(() => {
    const fetchOrders = async () => {
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
        .eq("status", "validated")
        .eq("delivered", false)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur Supabase :", error);
        return;
      }

      setConsultations(data);
    };

    fetchOrders();
  }, []);

  const handleDeliver = async (consultationId: string) => {
    const sessionRaw = localStorage.getItem("pharmacyUserSession");
    if (!sessionRaw) {
      alert("Session pharmacien introuvable.");
      return;
    }

    const session = JSON.parse(sessionRaw);
    const pharmacyId = session.clinicId || session.pharmacy_id;
    const pharmacistId = session.id || session.user_id;

    const deliveredAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("consultations")
      .update({ delivered: true, delivered_at: deliveredAt })
      .eq("id", consultationId);

    if (updateError) {
      alert("Erreur lors de la mise à jour de la consultation.");
      return;
    }

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
      alert("Erreur lors de l’archivage dans les délivrances.");
      return;
    }

    setConsultations((prev) =>
      prev.filter((c) => c.id !== consultationId)
    );
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">📦 Ordonnances en attente</h2>

      {consultations.length === 0 ? (
        <p>Aucune ordonnance à traiter.</p>
      ) : (
        consultations.map((consultation) => {
          const patient = consultation.patients;
          const doctor = consultation.doctors;

          return (
            <div
              key={consultation.id}
              className="bg-gray-100 p-4 rounded mb-3 shadow"
            >
              <p><strong>🧍 Patient :</strong> {patient?.full_name}</p>
              <p><strong>👨‍⚕️ Médecin :</strong> {doctor?.full_name}</p>
              <p><strong>📅 Date :</strong> {new Date(consultation.created_at).toLocaleString()}</p>
              <p><strong>🔐 Assuré :</strong> {patient?.is_assured ? "✅ Oui" : "❌ Non"}</p>
              <p><strong>🧬 Empreinte :</strong> {patient?.fingerprint_missing ? "❌ Absente" : "✅ Présente"}</p>
              <ul className="list-disc ml-6 my-2 text-sm">
                {consultation.consultation_medications?.map((med: any) => (
                  <li key={med.id}>{med.medication_name} – {med.dosage}</li>
                ))}
              </ul>
              <button
                onClick={() => handleDeliver(consultation.id)}
                className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                ✅ Délivrer
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
