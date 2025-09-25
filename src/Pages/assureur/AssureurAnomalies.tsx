// src/Pages/assureur/AssureurAnomalies.tsx
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Card } from "../../components/ui/card";

interface Anomaly {
  type: string;
  message: string;
  consultation_id: string | null;
}

export default function AnomaliesPage() {
  const { getToken } = useAuth(); // 🔐
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnomalies = async () => {
      try {
        const token = await getToken({ template: "supabase" });
        const res = await fetch("https://zwxegqevthzfphdqtjew.supabase.co/functions/v1/detect-anomalies", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({})
        });

        const text = await res.text();
        let data;

        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Réponse non JSON : ${text}`);
        }

        if (!res.ok) {
          console.error("Réponse Supabase non OK", res.status, data);
          throw new Error(data.error || `Erreur serveur : ${res.status}`);
        }

        setAnomalies(data.alerts || []);
      } catch (err) {
        console.error("Erreur lors de la récupération des anomalies", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnomalies();
  }, [getToken]); // ← dépendance correcte

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Anomalies détectées</h2>

      {loading ? (
        <p>Chargement...</p>
      ) : anomalies.length === 0 ? (
        <p>Aucune anomalie détectée cette semaine.</p>
      ) : (
        anomalies.map((a, index) => (
          <Card
            key={index}
            className={`p-4 border-l-4 ${
              a.type === "error" ? "border-red-500" : "border-orange-400"
            }`}
          >
            <p className="font-medium">{a.message}</p>
            {a.consultation_id && (
              <p className="text-sm text-gray-500">
                Consultation ID : {a.consultation_id}
              </p>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
