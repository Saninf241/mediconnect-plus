import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useUser } from "@clerk/clerk-react";

export default function TraitementsPage() {
  const { user } = useUser();
  const [medications, setMedications] = useState<any[]>([]);

  useEffect(() => {
    const fetchMedications = async () => {
      // Étape 1 : Récupérer le patient
      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .select("id")
        .eq("email", user?.primaryEmailAddress?.emailAddress)
        .single();

      if (!patient || patientError) return;

      // Étape 2 : Récupérer les IDs des consultations du patient
      const { data: consultations, error: consultError } = await supabase
        .from("consultations")
        .select("id")
        .eq("patient_id", patient.id);

      if (!consultations || consultError) return;

      const consultationIds = consultations.map((c) => c.id);

      if (consultationIds.length === 0) return;

      // Étape 3 : Récupérer les médicaments liés à ces consultations
      const { data, error } = await supabase
        .from("consultation_medications")
        .select("id, name, dosage, form, duration, instructions, created_at")
        .in("consultation_id", consultationIds)
        .order("created_at", { ascending: false });

      if (!error && data) setMedications(data);
    };

    fetchMedications();
  }, [user]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">💊 Mes traitements</h1>
      {medications.length === 0 ? (
        <p>Aucun traitement prescrit pour le moment.</p>
      ) : (
        <ul className="space-y-4">
          {medications.map((med) => (
            <li key={med.id} className="border p-4 rounded bg-white shadow">
              <p><strong>Médicament :</strong> {med.name}</p>
              <p><strong>Dosage :</strong> {med.dosage}</p>
              <p><strong>Forme :</strong> {med.form}</p>
              <p><strong>Durée :</strong> {med.duration}</p>
              <p><strong>Instructions :</strong> {med.instructions}</p>
              <p><strong>Date :</strong> {new Date(med.created_at).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
