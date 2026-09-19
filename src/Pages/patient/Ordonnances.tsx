// /src/Pages/patient/Ordonnances.tsx
import { usePatientPortalData } from "../../hooks/usePatientPortalData";

const STATUS_LABEL: Record<string, string> = {
  pending: "⏳ Pas encore retirée",
  partial: "⚠️ Retirée partiellement",
  delivered: "✅ Retirée en pharmacie",
};

export default function OrdonnancesPage() {
  const { data, loading, error } = usePatientPortalData();

  if (loading) return <p className="p-6">Chargement…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!data) return null;

  const consultationsWithMeds = data.consultations.filter(
    (c) => c.dispense_code
  );

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Mes ordonnances</h1>
      {consultationsWithMeds.length === 0 ? (
        <p>Aucune ordonnance disponible.</p>
      ) : (
        <ul className="space-y-4">
          {consultationsWithMeds.map((c) => (
            <li key={c.id} className="border p-4 rounded bg-white shadow">
              <p><strong>Date :</strong> {new Date(c.created_at).toLocaleDateString()}</p>
              <p><strong>Médecin :</strong> {c.doctor_name || "N/A"}</p>
              <p><strong>Établissement :</strong> {c.clinic_name || "N/A"}</p>
              {c.dispense_code && (
                <p className="mt-2 text-sm">
                  <strong>Code de retrait :</strong>{" "}
                  <span className="font-mono tracking-wider">
                    {c.dispense_code.replace(/(.{4})/g, "$1 ").trim()}
                  </span>
                </p>
              )}
              <p className="text-sm text-gray-600 mt-1">
                {c.delivery_status ? STATUS_LABEL[c.delivery_status] : ""}
                {c.delivery_status !== "pending" && c.delivered_at && (
                  <> le {new Date(c.delivered_at).toLocaleDateString()}</>
                )}
                {c.pharmacy_name && c.delivery_status === "pending" && (
                  <> — pharmacie associée : {c.pharmacy_name}</>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
