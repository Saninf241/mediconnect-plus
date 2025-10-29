import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../../lib/supabase";

export default function DoctorPatientDetailsPage() {
  const { id } = useParams(); // patient_id
  const [patient, setPatient] = useState<any>(null);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      setLoading(true);

      const { data: p } = await supabase
        .from("patients")
        .select("id,name,date_of_birth,is_assured,insurance_number,medical_history")
        .eq("id", id)
        .single();

      const { data: c } = await supabase
        .from("consultations")
        .select("id,created_at,diagnosis,amount,status")
        .eq("patient_id", id)
        .order("created_at", { ascending: false });

      setPatient(p || null);
      setConsultations(c || []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="p-6">Chargement…</div>;
  if (!patient) return <div className="p-6">Patient introuvable.</div>;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{patient.name}</h1>
        <Link
          to={`/multispecialist/doctor/new-consultation?patient_id=${patient.id}`}
          className="px-4 py-2 rounded bg-blue-600 text-white"
        >
          Démarrer une consultation
        </Link>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded shadow">
          <h2 className="font-semibold mb-2">Identité</h2>
          <p>Assuré : {patient.is_assured ? "Oui" : "Non"}</p>
          <p>N° assuré : {patient.insurance_number || "—"}</p>
          <p>Antécédents : {patient.medical_history || "—"}</p>
        </div>

        <div className="p-4 bg-white rounded shadow md:col-span-2">
          <h2 className="font-semibold mb-2">Consultations</h2>
          <div className="divide-y">
            {consultations.length === 0 && <p>Aucune consultation.</p>}
            {consultations.map((c) => (
              <div key={c.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">
                    {new Date(c.created_at).toLocaleString()}
                  </div>
                  <div className="font-medium">{c.diagnosis || "—"}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">{c.status}</div>
                  <div className="font-semibold">{c.amount ? `${c.amount} FCFA` : "—"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
