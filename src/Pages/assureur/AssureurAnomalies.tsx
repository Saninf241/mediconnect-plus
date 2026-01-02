// src/Pages/assureur/AssureurAnomalies.tsx
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Card } from "../../components/ui/card";

interface Anomaly {
  type: "error" | "warning" | "info";
  message: string;
  consultation_id: string | null;
}

export default function AnomaliesPage() {
  const { getToken } = useAuth();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnomalies = async () => {
      setLoading(true);
      setErrMsg(null);

      try {
        // ✅ IMPORTANT : token Clerk standard (PAS template supabase)
        const token = await getToken();
        if (!token) throw new Error("No auth token (Clerk)");

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
        let data: any = null;
        try {
          data = JSON.parse(raw);
        } catch {
          // si la fonction renvoie un HTML / texte
          throw new Error(`Réponse non JSON: ${raw.slice(0, 200)}`);
        }

        if (!res.ok) {
          throw new Error(data?.error || `Erreur serveur: ${res.status}`);
        }

        setAnomalies(data.alerts || []);
      } catch (e: any) {
        console.error("[AssureurAnomalies] fetch error:", e);
        setErrMsg(e?.message || "Erreur inconnue");
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
      ) : errMsg ? (
        <div className="p-4 rounded border border-red-200 bg-red-50 text-red-700">
          <div className="font-semibold">Erreur</div>
          <div>{errMsg}</div>
          <div className="text-sm mt-2 text-red-600">
            Vérifie les logs de la fonction Supabase <code>detect-anomalies</code>.
          </div>
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
