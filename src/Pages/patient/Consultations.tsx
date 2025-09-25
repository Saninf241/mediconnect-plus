import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useUser } from "@clerk/clerk-react";

export default function ConsultationsPage() {
  const { user } = useUser();
  const [consultations, setConsultations] = useState<any[]>([]);

  useEffect(() => {
    const fetchConsultations = async () => {
      if (!user?.primaryEmailAddress?.emailAddress) return;

      const email = user.primaryEmailAddress.emailAddress;

      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("id")
        .eq("email", email)
        .single();

      if (patientError || !patientData) {
        console.error("Erreur patient :", patientError);
        return;
      }

      const { data, error } = await supabase
        .from("consultations")
        .select(`
          id,
          created_at,
          symptoms,
          diagnosis,
          doctor_id,
          clinic_id,
          doctors ( full_name ),
          clinics ( name )
        `)
        .eq("patient_id", patientData.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur consultations :", error);
      } else {
        setConsultations(data);
      }
    };

    fetchConsultations();
  }, [user]);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Mes consultations passées</h1>

      {consultations.length === 0 ? (
        <p>Aucune consultation enregistrée.</p>
      ) : (
        <ul className="space-y-4">
          {consultations.map((c) => (
            <li key={c.id} className="border p-4 rounded bg-white shadow">
              <p><strong>Date :</strong> {new Date(c.created_at).toLocaleString()}</p>
              <p><strong>Établissement :</strong> {c.clinics?.name || 'N/A'}</p>
              <p><strong>Médecin :</strong> {c.doctors?.full_name || 'N/A'}</p>
              <p><strong>Symptômes :</strong> {c.symptoms}</p>
              <p><strong>Diagnostic :</strong> {c.diagnosis}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
