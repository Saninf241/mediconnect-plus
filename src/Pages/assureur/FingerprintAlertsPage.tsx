import { useEffect, useState } from 'react';
import { getAllConsultations } from '../../lib/queries/consultations';

interface Consultation {
  id: string;
  created_at: string;
  amount: number;
  status: string;
  anomaly: boolean;
  fingerprint_missing: boolean;
  patient_name: string;
  doctor_name: string;
  clinic_name: string;
}

export default function FingerprintAlertsPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const all = await getAllConsultations();
      const anomalies = all.filter(c => c.anomaly === true);
      setConsultations(anomalies);
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Prestations assurées sans empreinte</h1>

      {loading ? (
        <p>Chargement...</p>
      ) : consultations.length === 0 ? (
        <p>Aucune prestation signalée comme suspecte.</p>
      ) : (
        <ul className="space-y-4">
          {consultations.map((c) => (
            <li key={c.id} className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded shadow-sm">
              <p><strong>Date :</strong> {new Date(c.created_at).toLocaleDateString()}</p>
              <p><strong>Patient :</strong> {c.patient_name}</p>
              <p><strong>Médecin :</strong> {c.doctor_name}</p>
              <p><strong>Établissement :</strong> {c.clinic_name}</p>
              <p><strong>Montant :</strong> {c.amount.toLocaleString()} FCFA</p>
              <p className="text-yellow-700 font-medium">⚠️ Empreinte manquante</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
