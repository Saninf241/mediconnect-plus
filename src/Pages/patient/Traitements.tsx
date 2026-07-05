// /src/Pages/patient/Traitements.tsx
import { usePatientPortalData } from "../../hooks/usePatientPortalData";

export default function TraitementsPage() {
  const { data, loading, error } = usePatientPortalData();

  if (loading) return <p className="p-6">Chargement…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!data) return null;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Mes traitements</h1>
      {data.treatments.length === 0 ? (
        <p>Aucun traitement prescrit pour le moment.</p>
      ) : (
        <ul className="space-y-4">
          {data.treatments.map((med) => (
            <li key={med.id} className="border p-4 rounded bg-white shadow">
              <p><strong>Médicament :</strong> {med.name}</p>
              <p><strong>Dosage :</strong> {med.dosage}</p>
              <p><strong>Forme :</strong> {med.form}</p>
              {med.duration && <p><strong>Durée :</strong> {med.duration}</p>}
              {med.instructions && <p><strong>Instructions :</strong> {med.instructions}</p>}
              <p className="text-sm text-gray-500">
                {new Date(med.created_at).toLocaleDateString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
