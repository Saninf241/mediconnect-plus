// src/Pages/assureur/PaiementsPage.tsx
// Historique des remboursements de l'assureur connecte : consultations
// qu'il a validees (status="accepted"), avec le montant a sa charge et
// le statut de paiement vers la clinique. Remplace l'ancienne version qui
// lisait `payment_batches` (aucune colonne insurer_id sur cette table --
// elle exposait donc les lots de paiement de TOUTES les cliniques de la
// plateforme a n'importe quel assureur) et referencait un champ
// `total_amount` inexistant sur ce schema.
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { supabase } from "../../lib/supabase";
import { useInsurerContext } from "../../hooks/useInsurerContext";

type PaymentRow = {
  id: string;
  insurer_decision_at: string | null;
  insurer_amount: number | null;
  payment_status: string | null;
  payment_date: string | null;
  clinic: { name: string | null } | null;
  patients: { full_name: string | null } | null;
};

type StatusFilter = "all" | "pending" | "paid";

export default function PaiementsPage() {
  const { ctx, loading: ctxLoading } = useInsurerContext();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    if (!ctx) return;

    const fetchRows = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("consultations")
        .select(
          "id, insurer_decision_at, insurer_amount, payment_status, payment_date, clinic:clinic_id(name), patients:patient_id(full_name)"
        )
        .eq("insurer_id", ctx.insurerId)
        .eq("status", "accepted")
        .order("insurer_decision_at", { ascending: false });

      if (error) {
        console.error("[PaiementsPage] erreur chargement :", error.message);
        toast.error("Erreur lors du chargement des paiements.");
        setRows([]);
      } else {
        setRows((data ?? []) as any);
      }
      setLoading(false);
    };

    fetchRows();
  }, [ctx]);

  const isPaid = (r: PaymentRow) => (r.payment_status ?? "").toLowerCase() === "paid";

  const counts = useMemo(() => {
    const paid = rows.filter(isPaid).length;
    return { all: rows.length, paid, pending: rows.length - paid };
  }, [rows]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return rows;
    if (statusFilter === "paid") return rows.filter(isPaid);
    return rows.filter((r) => !isPaid(r));
  }, [rows, statusFilter]);

  const totalAmount = useMemo(
    () => filtered.reduce((sum, r) => sum + (r.insurer_amount ?? 0), 0),
    [filtered]
  );

  if (ctxLoading || loading) {
    return <p>Chargement...</p>;
  }

  if (!ctx) {
    return <p className="text-red-600">Impossible de déterminer votre compte assureur.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Historique des paiements</h2>
          <p className="text-sm text-gray-500">
            {counts.all} consultation(s) validée(s) — {counts.pending} en attente, {counts.paid} payée(s)
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            className={statusFilter === "all" ? "bg-black text-white" : "bg-white text-gray-900 border"}
            onClick={() => setStatusFilter("all")}
          >
            Toutes ({counts.all})
          </Button>
          <Button
            className={statusFilter === "pending" ? "bg-yellow-600 text-white" : "bg-white text-gray-900 border"}
            onClick={() => setStatusFilter("pending")}
          >
            En attente ({counts.pending})
          </Button>
          <Button
            className={statusFilter === "paid" ? "bg-green-600 text-white" : "bg-white text-gray-900 border"}
            onClick={() => setStatusFilter("paid")}
          >
            Payées ({counts.paid})
          </Button>
        </div>
      </div>

      <Card className="p-4 bg-gray-50">
        <span className="text-sm text-gray-500">Montant total ({statusFilter === "all" ? "toutes" : statusFilter === "paid" ? "payées" : "en attente"}) :</span>{" "}
        <span className="font-semibold">{totalAmount.toLocaleString()} FCFA</span>
      </Card>

      {filtered.length === 0 ? (
        <p>Aucun paiement sur ce filtre.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const paid = isPaid(r);
            return (
              <Card key={r.id} className={`p-4 border-l-4 ${paid ? "border-green-500" : "border-yellow-400"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                    <div>
                      <span className="text-gray-500">Clinique :</span>{" "}
                      <span className="font-medium">{r.clinic?.name ?? "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Patient :</span>{" "}
                      <span className="font-medium">{r.patients?.full_name ?? "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Montant assureur :</span>{" "}
                      <span className="font-medium">
                        {typeof r.insurer_amount === "number" ? `${r.insurer_amount.toLocaleString()} FCFA` : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Statut :</span>{" "}
                      <span className={`font-medium ${paid ? "text-green-600" : "text-yellow-600"}`}>
                        {paid ? "Payé" : "En attente"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Validé le{" "}
                      {r.insurer_decision_at ? new Date(r.insurer_decision_at).toLocaleDateString("fr-FR") : "—"}
                      {r.payment_date ? (
                        <> • Payé le {new Date(r.payment_date).toLocaleDateString("fr-FR")}</>
                      ) : null}
                    </div>
                  </div>

                  <Button
                    className="bg-white text-gray-900 border hover:bg-gray-50"
                    onClick={() => window.open(`/assureur/consultations/${encodeURIComponent(r.id)}`, "_blank")}
                  >
                    Ouvrir
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
