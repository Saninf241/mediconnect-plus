// /src/Pages/patient/Consultations.tsx
import { usePatientPortalData } from "../../hooks/usePatientPortalData";

export default function ConsultationsPage() {
  const { data, loading, error } = usePatientPortalData();

  if (loading) return <p className="p-6">Chargement…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!data) return null;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Mes consultations</h1>

      {data.consultations.length === 0 ? (
        <p>Aucune consultation enregistrée.</p>
      ) : (
        <ul className="space-y-4">
          {data.consultations.map((c) => (
            <li key={c.id} className="border p-4 rounded bg-white shadow">
              <p><strong>Date :</strong> {new Date(c.created_at).toLocaleDateString()}</p>
              <p><strong>Établissement :</strong> {c.clinic_name || "N/A"}</p>
              <p>
                <strong>Médecin :</strong> {c.doctor_name || "N/A"}
                {c.doctor_speciality ? ` (${c.doctor_speciality})` : ""}
              </p>
              <p><strong>Type :</strong> {c.type}</p>
              {c.next_visit_date && (
                <p className="text-emerald-700">
                  Prochain suivi conseillé : {new Date(c.next_visit_date).toLocaleDateString()}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
