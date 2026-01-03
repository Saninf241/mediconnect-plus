// src/pages/assureur/FingerprintAlertsPage.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

type Row = {
  id: string;
  created_at: string;
  amount: number | null;

  patient_name: string | null;
  patient_is_assured: boolean | null;

  doctor_name: string | null;
  clinic_name: string | null;

  fingerprint_missing: boolean | null;
  biometric_verified_at: string | null;
};

export default function FingerprintAlertsPage() {
  const [alerts, setAlerts] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("consultations_fingerprint_alerts_30d")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[FingerprintAlertsPage] error:", error);
        setAlerts([]);
      } else {
        setAlerts((data ?? []) as any);
      }

      setLoading(false);
    };

    load();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Prestations assurées sans empreinte</h1>
          <p className="text-sm text-gray-500">Derniers 30 jours</p>
        </div>
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : alerts.length === 0 ? (
        <p>Aucune prestation suspecte sur la période.</p>
      ) : (
        <ul className="space-y-4">
          {alerts.map((c) => {
            const dt = new Date(c.created_at);
            const dateStr = dt.toLocaleDateString("fr-FR");
            const timeStr = dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

            const reason =
              c.fingerprint_missing
                ? "fingerprint_missing = true"
                : !c.biometric_verified_at
                ? "biometric_verified_at IS NULL"
                : "—";

            return (
              <li key={c.id}>
                <Card className="p-4 border-l-4 border-yellow-500 bg-yellow-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="font-semibold text-yellow-900">
                        ⚠️ Empreinte manquante pour une prestation assurée
                      </div>

                      <div className="text-sm">
                        <span className="text-gray-600">Date :</span> {dateStr} • {timeStr}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <div>
                          <span className="text-gray-600">Patient :</span>{" "}
                          <span className="font-medium">{c.patient_name ?? "—"}</span>{" "}
                          {c.patient_is_assured ? <span className="text-gray-600">(assuré)</span> : null}
                        </div>
                        <div>
                          <span className="text-gray-600">Clinique :</span>{" "}
                          <span className="font-medium">{c.clinic_name ?? "—"}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Médecin :</span>{" "}
                          <span className="font-medium">{c.doctor_name ?? "—"}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Montant :</span>{" "}
                          <span className="font-medium">
                            {typeof c.amount === "number" ? `${c.amount.toLocaleString()} FCFA` : "—"}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500">
                        Consultation ID : {c.id} • Cause : {reason}
                      </div>
                    </div>

                    <Button
                      className="bg-white text-gray-900 border hover:bg-gray-50"
                      onClick={() => {
                        // adapte la route si tu as un détail consultation assureur
                        window.open(`/assureur/consultations/${encodeURIComponent(c.id)}`, "_blank");
                      }}
                    >
                      Ouvrir
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
