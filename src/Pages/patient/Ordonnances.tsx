// /src/Pages/patient/Ordonnances.tsx
import { usePatientPortalData } from "../../hooks/usePatientPortalData";

export default function OrdonnancesPage() {
  const { data, loading, error } = usePatientPortalData();

  if (loading) return <p className="p-6">Chargement…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!data) return null;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Mes ordonnances</h1>
      {data.prescriptions.length === 0 ? (
        <p>Aucune ordonnance disponible.</p>
      ) : (
        <ul className="space-y-4">
          {data.prescriptions.map((p) => (
            <li key={p.id} className="border p-4 rounded bg-white shadow">
              <p><strong>Date :</strong> {new Date(p.created_at).toLocaleDateString()}</p>
              <p><strong>Médecin :</strong> {p.clinic_staff?.name || "N/A"}</p>
              <p><strong>Contenu :</strong> {p.content}</p>
              <p className="text-sm text-gray-500 mt-1">
                {p.printed_once ? "Déjà remise à la pharmacie" : "Pas encore utilisée"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
