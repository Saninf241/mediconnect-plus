// /src/Pages/patient/Pharmacie.tsx
import { usePatientPortalData } from "../../hooks/usePatientPortalData";

export default function RecusPharmaciePage() {
  const { data, loading, error } = usePatientPortalData();

  if (loading) return <p className="p-6">Chargement…</p>;
  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!data) return null;

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Mes reçus pharmacie</h1>
      {data.pharmacyReceipts.length === 0 ? (
        <p>Aucun reçu enregistré.</p>
      ) : (
        <ul className="space-y-4">
          {data.pharmacyReceipts.map((receipt) => (
            <li key={receipt.id} className="border p-4 rounded bg-white shadow">
              <p><strong>Pharmacie :</strong> {receipt.pharmacy_name}</p>
              <p><strong>Date :</strong> {new Date(receipt.receipt_date).toLocaleDateString()}</p>
              <p><strong>Montant :</strong> {receipt.total_amount} FCFA</p>
              {receipt.items && (
                <div className="mt-2">
                  <strong>Produits :</strong>
                  <ul className="list-disc list-inside">
                    {Object.entries(receipt.items).map(([key, value]: any) => (
                      <li key={key}>
                        {value.name} – {value.quantity} x {value.unit_price} FCFA
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
