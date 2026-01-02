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
  const { getToken } = useAuth();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnomalies = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const token = await getToken({ template: "supabase" });
        if (!token) throw new Error("Token manquant (Clerk)");

        const res = await fetch(
          "https://zwxegqevthzfphdqtjew.supabase.co/functions/v1/detect-anomalies",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({}),
          }
        );

        const raw = await res.text();
        let data: any;
        try {
          data = JSON.parse(raw);
        } catch {
          data = { success: false, error: raw };
        }

        if (!res.ok) {
          throw new Error(data?.error || `Erreur serveur: ${res.status}`);
        }

        setAnomalies(data.alerts || []);
      } catch (err: any) {
        console.error("[AssureurAnomalies] fetch error:", err);
        setErrorMsg(err?.message || "Erreur inconnue");
        setAnomalies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnomalies();
  }, [getToken]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Anomalies détectées</h2>

      {loading ? (
        <p>Chargement...</p>
      ) : errorMsg ? (
        <div className="p-4 border border-red-200 bg-red-50 rounded">
          <p className="font-semibold text-red-700">Erreur</p>
          <p className="text-red-700">{errorMsg}</p>
          <p className="text-sm text-red-500 mt-2">
            Vérifie les logs de la fonction Supabase <code>detect-anomalies</code>.
          </p>
        </div>
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

