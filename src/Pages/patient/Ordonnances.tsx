import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useUser } from "@clerk/clerk-react";

export default function OrdonnancesPage() {
  const { user } = useUser();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("id")
        .eq("email", user?.primaryEmailAddress?.emailAddress)
        .single();

      if (patientError || !patientData) return;

      const { data, error } = await supabase
        .from("prescriptions")
        .select(`
          id,
          content,
          printed_once,
          created_at,
          doctors ( full_name )
        `)
        .eq("patient_id", patientData.id)
        .order("created_at", { ascending: false });

      if (!error && data) setPrescriptions(data);
    };

    fetchPrescriptions();
  }, [user]);

  const handlePrint = (prescription: any) => {
    if (prescription.printed_once) {
      alert("L'ordonnance a déjà été imprimée.");
      return;
    }

    window.print();

    // Optionnel : Marquer comme imprimée via Supabase RPC / update
    supabase
      .from("prescriptions")
      .update({ printed_once: true })
      .eq("id", prescription.id);
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">📄 Mes ordonnances</h1>
      {prescriptions.length === 0 ? (
        <p>Aucune ordonnance disponible.</p>
      ) : (
        <ul className="space-y-4">
          {prescriptions.map((prescription) => (
            <li key={prescription.id} className="border p-4 rounded bg-white shadow">
              <p><strong>Date :</strong> {new Date(prescription.created_at).toLocaleDateString()}</p>
              <p><strong>Médecin :</strong> {prescription.doctors?.full_name || 'N/A'}</p>
              <p><strong>Ordonnance :</strong> {prescription.content}</p>
              <button
                disabled={prescription.printed_once}
                onClick={() => handlePrint(prescription)}
                className={`mt-2 px-4 py-2 rounded ${
                  prescription.printed_once ? "bg-gray-400" : "bg-blue-600 text-white"
                }`}
              >
                {prescription.printed_once ? "Déjà imprimée" : "Imprimer"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
