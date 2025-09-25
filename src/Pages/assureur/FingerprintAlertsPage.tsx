// src/pages/assureur/FingerprintAlertsPage.tsx

import { useEffect, useState } from "react";
import {
  getFingerprintAlerts,
  type ConsultationAlertRow,
} from "../../lib/queries/consultations";

export default function FingerprintAlertsPage() {
  const [alerts, setAlerts] = useState<ConsultationAlertRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const rows = await getFingerprintAlerts(); // ← lit la vue `consultations_alerts`
      setAlerts(rows);
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Prestations assurées sans empreinte</h1>

      {loading ? (
        <p>Chargement...</p>
      ) : alerts.length === 0 ? (
        <p>Aucune prestation signalée comme suspecte.</p>
      ) : (
        <ul className="space-y-4">
          {alerts.map((c) => (
            <li
              key={c.id}
              className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded shadow-sm"
            >
              <p>
                <strong>Date :</strong>{" "}
                {new Date(c.created_at).toLocaleDateString()}
              </p>
              <p>
                <strong>Patient :</strong> {c.patient_name}
                {c.patient_is_assured ? " (assuré)" : ""}
              </p>
              <p>
                <strong>Médecin :</strong> {c.doctor_name}
              </p>
              <p>
                <strong>Établissement :</strong> {c.clinic_name}
              </p>
              <p>
                <strong>Montant :</strong>{" "}
                {(c.amount ?? 0).toLocaleString()} FCFA
              </p>
              <p className="text-yellow-700 font-medium">
                ⚠️ Empreinte manquante pour une prestation assurée
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
