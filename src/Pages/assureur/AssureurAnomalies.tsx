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

        // ✅ lire une seule fois
        const raw = await res.text();

        let data: any = null;
        try {
          data = raw ? JSON.parse(raw) : null;
        } catch {
          data = { success: false, error: raw || "Réponse non JSON" };
        }

        if (!res.ok) {
          const msg =
            data?.error ||
            `Erreur serveur : ${res.status} ${res.statusText}`;
          console.error("[AssureurAnomalies] API error:", res.status, data);
          throw new Error(msg);
        }

        setAnomalies(data.alerts || []);
      } catch (err: any) {
        console.error("[AssureurAnomalies] fetch error:", err);
        setErrorMsg(err?.message || "Erreur inconnue");
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
          <p className="text-xs text-red-600 mt-2">
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
