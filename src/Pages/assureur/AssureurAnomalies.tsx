// src/Pages/assureur/AssureurAnomalies.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

type AlertType = "error" | "warning" | "info";

type AnomalyRow = {
  type: AlertType;
  title: string | null;
  message: string | null;

  consultation_id: string | null;
  created_at: string;

  patient_id: string | null;
  patient_name: string | null;
  patient_is_assured: boolean | null;

  clinic_id: string | null;
  clinic_name: string | null;

  doctor_id: string | null;
  doctor_name: string | null;

  amount: number | null;
};

function badgeClasses(type: AlertType) {
  if (type === "error") return "bg-red-100 text-red-800 border-red-200";
  if (type === "warning") return "bg-orange-100 text-orange-800 border-orange-200";
  return "bg-blue-100 text-blue-800 border-blue-200";
}

function leftBorder(type: AlertType) {
  if (type === "error") return "border-red-500";
  if (type === "warning") return "border-orange-400";
  return "border-blue-400";
}

export default function AssureurAnomalies() {
  const [rows, setRows] = useState<AnomalyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<AlertType | "all">("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("consultations_anomalies_7d")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[AssureurAnomalies] supabase error:", error);
        setRows([]);
      } else {
        setRows((data ?? []) as any);
      }

      setLoading(false);
    };

    load();
  }, []);

  const filtered = useMemo(() => {
    if (typeFilter === "all") return rows;
    return rows.filter((r) => r.type === typeFilter);
  }, [rows, typeFilter]);

  const counts = useMemo(() => {
    const c = { error: 0, warning: 0, info: 0 };
    for (const r of rows) c[r.type] += 1;
    return c;
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Anomalies détectées</h2>
          <p className="text-sm text-gray-500">
            Derniers 7 jours — {rows.length} alerte(s) ({counts.error} erreurs, {counts.warning} warnings)
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            className={typeFilter === "all" ? "bg-black text-white" : "bg-white text-gray-900 border"}
            onClick={() => setTypeFilter("all")}
          >
            Toutes
          </Button>
          <Button
            className={typeFilter === "error" ? "bg-red-600 text-white" : "bg-white text-gray-900 border"}
            onClick={() => setTypeFilter("error")}
          >
            Erreurs ({counts.error})
          </Button>
          <Button
            className={typeFilter === "warning" ? "bg-orange-500 text-white" : "bg-white text-gray-900 border"}
            onClick={() => setTypeFilter("warning")}
          >
            Warnings ({counts.warning})
          </Button>
        </div>
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : filtered.length === 0 ? (
        <p>Aucune anomalie sur la période.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((a, idx) => {
            const dt = new Date(a.created_at);
            const dateStr = dt.toLocaleDateString("fr-FR");
            const timeStr = dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

            return (
              <Card
                key={`${a.consultation_id ?? "none"}-${idx}`}
                className={`p-4 border-l-4 ${leftBorder(a.type)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded border ${badgeClasses(a.type)}`}>
                        {a.type === "error" ? "ERREUR" : a.type === "warning" ? "WARNING" : "INFO"}
                      </span>
                      <div className="font-semibold">{a.title ?? "Anomalie"}</div>
                    </div>

                    {a.message && <div className="text-sm text-gray-700">{a.message}</div>}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      <div>
                        <span className="text-gray-500">Patient :</span>{" "}
                        <span className="font-medium">{a.patient_name ?? "—"}</span>
                        {a.patient_is_assured ? <span className="text-gray-500"> (assuré)</span> : null}
                      </div>

                      <div>
                        <span className="text-gray-500">Clinique :</span>{" "}
                        <span className="font-medium">{a.clinic_name ?? "—"}</span>
                      </div>

                      <div>
                        <span className="text-gray-500">Médecin :</span>{" "}
                        <span className="font-medium">{a.doctor_name ?? "—"}</span>
                      </div>

                      <div>
                        <span className="text-gray-500">Montant :</span>{" "}
                        <span className="font-medium">
                          {typeof a.amount === "number" ? `${a.amount.toLocaleString()} FCFA` : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      {dateStr} • {timeStr}
                      {a.consultation_id ? <> • Consultation ID : {a.consultation_id}</> : null}
                    </div>
                  </div>

                  {a.consultation_id ? (
                    <Button
                      className="bg-white text-gray-900 border hover:bg-gray-50"
                      onClick={() => {
                        // adapte la route si tu as une page détail consultation côté assureur
                        window.open(`/assureur/consultations/${encodeURIComponent(a.consultation_id!)}`, "_blank");
                      }}
                    >
                      Ouvrir
                    </Button>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
