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
        const token = await getToken({ template: "supabase" });
        if (!token) throw new Error("Impossible de récupérer le token Supabase (Clerk).");

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

        const text = await res.text();
        let data: any = null;

        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          throw new Error(`Réponse non JSON : ${text}`);
        }

        if (!res.ok) {
          const msg = data?.error || `Erreur serveur : ${res.status}`;
          throw new Error(msg);
        }

        setAnomalies(Array.isArray(data?.alerts) ? data.alerts : []);
      } catch (err: any) {
        console.error("[AssureurAnomalies] fetch error:", err);
        setErrMsg(err?.message || "Erreur inconnue");
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
      ) : errMsg ? (
        <div className="p-4 rounded border border-red-200 bg-red-50 text-red-700">
          <div className="font-semibold">Erreur</div>
          <div className="text-sm">{errMsg}</div>
          <div className="text-xs mt-2 opacity-80">
            Vérifie la fonction Supabase `detect-anomalies` (logs) et le secret `SUPABASE_JWT_SECRET`.
          </div>
        </div>
      ) : anomalies.length === 0 ? (
        <p>Aucune anomalie détectée cette semaine.</p>
      ) : (
        anomalies.map((a, index) => (
          <Card
            key={index}
            className={`p-4 border-l-4 ${
              a.type === "error" ? "border-red-500" : a.type === "warning" ? "border-orange-400" : "border-blue-400"
            }`}
          >
            <p className="font-medium">{a.message}</p>
            {a.consultation_id && (
              <p className="text-sm text-gray-500">Consultation ID : {a.consultation_id}</p>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
