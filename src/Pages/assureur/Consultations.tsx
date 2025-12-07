// src/Pages/assureur/Consultations.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useInsurerContext } from "../../hooks/useInsurerContext";
import { Button } from "../../components/ui/button";

type ConsultationRow = {
  id: string;
  created_at: string;
  amount: number | null;
  status: string;
  insurer_comment: string | null;
  patient?: { full_name: string } | null;
  clinic?: { name: string } | null;
};

export default function AssureurConsultationsPage() {
  const { ctx } = useInsurerContext();
  const [items, setItems] = useState<ConsultationRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ctx?.insurerId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("consultations")
        .select(`
          id,
          created_at,
          amount,
          status,
          insurer_comment,
          patients:patient_id ( full_name ),
          clinic:clinic_id ( name )
        `)
        .eq("insurer_id", ctx.insurerId)
        .eq("status", "sent")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setItems(data as any);
      } else {
        console.error("[AssureurConsultations] error", error);
      }
      setLoading(false);
    })();
  }, [ctx?.insurerId]);

  async function updateStatus(id: string, decision: "accepted" | "rejected") {
    const comment = window.prompt("Commentaire (optionnel) ?") || null;
    const { error } = await supabase
      .from("consultations")
      .update({
        status: decision,
        insurer_comment: comment,
        insurer_decision_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      alert("Erreur mise à jour");
    } else {
      setItems((prev) => prev.filter((c) => c.id !== id)); // on retire la ligne de la liste 'sent'
    }
  }

  if (!ctx) return <div>Aucun assureur lié à ce compte.</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Consultations à valider</h1>
      {loading && <p>Chargement...</p>}

      {!loading && items.length === 0 && (
        <p>Aucune consultation en attente pour le moment.</p>
      )}

      <div className="space-y-3">
        {items.map((c) => (
          <div key={c.id} className="border rounded-lg p-3 flex items-center justify-between">
            <div>
              <div className="font-semibold">
                {c.patient?.full_name || "Patient inconnu"} — {c.clinic?.name || "Structure ?"}
              </div>
              <div className="text-sm text-gray-600">
                {new Date(c.created_at).toLocaleString()} — Montant : {c.amount ?? 0} FCFA
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                className="bg-green-600"
                onClick={() => updateStatus(c.id, "accepted")}
              >
                Accepter
              </Button>
              <Button
                className="bg-red-600"
                onClick={() => updateStatus(c.id, "rejected")}
              >
                Rejeter
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
