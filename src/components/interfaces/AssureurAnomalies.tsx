// src/components/interfaces/AssureurAnomalies.tsx
import { useEffect, useState } from "react";
import { getAllConsultations } from "../../lib/queries/consultations";
import { ConsultationWithRelations } from "@/types/types";
import { Card, CardContent } from "../ui/card";

export default function AssureurAnomalies() {
  const [anomalies, setAnomalies] = useState<ConsultationWithRelations[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const data = await getAllConsultations();
      const filtered = data.filter(
        (c) =>
          !c.patient ||
          !c.doctor ||
          !c.clinic ||
          c.amount <= 0 ||
          !["pending", "completed", "rejected"].includes(c.status)
      );
      setAnomalies(filtered);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Détection des anomalies</h2>
      <p className="text-muted-foreground">
        Consultations avec données manquantes, statut ou montant incohérent.
      </p>

      {anomalies.length === 0 ? (
        <p className="text-green-600">Aucune anomalie détectée 🎉</p>
      ) : (
        <div className="grid gap-4">
          {anomalies.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 space-y-2">
                <p><strong>Date :</strong> {new Date(c.created_at).toLocaleDateString()}</p>
                <p><strong>Montant :</strong> {c.amount} FCFA</p>
                <p><strong>Statut :</strong> {c.status}</p>
                {!c.patient && <p className="text-red-600">❌ Patient manquant</p>}
                {!c.doctor && <p className="text-red-600">❌ Médecin manquant</p>}
                {!c.clinic && <p className="text-red-600">❌ Établissement manquant</p>}
                {c.amount <= 0 && <p className="text-red-600">❌ Montant invalide</p>}
                {!["pending", "completed", "rejected"].includes(c.status) && (
                  <p className="text-red-600">❌ Statut invalide</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
