// src/Pages/assureur/AssureurAnomalies.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/card";

type AnomalyRow = {
  type: "error" | "warning" | "info";
  title: string;
  message: string;
  consultation_id: string | null;
  created_at: string;
};

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<AnomalyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErrMsg(null);

      const { data, error } = await supabase
        .from("consultations_anomalies_7d")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[AssureurAnomalies] view error:", error);
        setErrMsg(error.message);
        setAnomalies([]);
      } else {
        setAnomalies((data || []) as AnomalyRow[]);
      }

      setLoading(false);
    };

    run();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Anomalies détectées</h2>

      {loading ? (
        <p>Chargement...</p>
      ) : errMsg ? (
        <Card className="p-4 border border-red-200 bg-red-50">
          <p className="font-semibold text-red-700">Erreur</p>
          <p className="text-red-700">{errMsg}</p>
        </Card>
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
            <p className="font-semibold">{a.title}</p>
            <p className="font-medium">{a.message}</p>
            {a.consultation_id && (
              <p className="text-sm text-gray-500">
                Consultation ID : {a.consultation_id}
              </p>
            )}
            <p className="text-xs text-gray-500">
              {new Date(a.created_at).toLocaleString()}
            </p>
          </Card>
        ))
      )}
    </div>
  );
}
