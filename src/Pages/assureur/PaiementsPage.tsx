// src/Pages/assureur/PaiementsPage.tsx
// Workflow de remboursement : regroupe les consultations acceptees et
// tarifees par clinique en lots de paiement (payment_batches), et permet
// de marquer un lot paye (admin) ou d'exporter en CSV. Remplace l'ancienne
// version qui lisait payment_batches sans scoping assureur et referencait
// des champs inexistants sur ce schema.
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "@clerk/clerk-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { supabase } from "../../lib/supabase";
import { useInsurerContext } from "../../hooks/useInsurerContext";

const FUNCTIONS_BASE = "https://zwxegqevthzfphdqtjew.supabase.co/functions/v1";

type PendingConsultation = {
  id: string;
  clinic_id: string | null;
  insurer_amount: number | null;
  pricing_status: string | null;
  clinic: { name: string | null } | null;
};

type Batch = {
  id: string;
  clinic_id: string | null;
  amount: number | null;
  total_paid: number | null;
  status: string | null;
  period_start: string | null;
  period_end: string | null;
  consultation_count: number | null;
  created_at: string | null;
  paid_at: string | null;
  clinic: { name: string | null } | null;
};

type BatchFilter = "all" | "pending" | "paid";

export default function PaiementsPage() {
  const { ctx, loading: ctxLoading } = useInsurerContext();
  const { getToken } = useAuth();

  const [pending, setPending] = useState<PendingConsultation[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchFilter, setBatchFilter] = useState<BatchFilter>("all");
  const [generatingClinicId, setGeneratingClinicId] = useState<string | null>(null);
  const [markingBatchId, setMarkingBatchId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const canMarkPaid = ctx?.role === "admin";

  const load = async () => {
    if (!ctx) return;
    setLoading(true);

    const [consultRes, batchesRes] = await Promise.all([
      supabase
        .from("consultations")
        .select("id, clinic_id, insurer_amount, pricing_status, clinic:clinic_id(name)")
        .eq("insurer_id", ctx.insurerId)
        .eq("status", "accepted"),
      supabase
        .from("payment_batches")
        .select(
          "id, clinic_id, amount, total_paid, status, period_start, period_end, consultation_count, created_at, paid_at, clinic:clinic_id(name)"
        )
        .order("created_at", { ascending: false }),
    ]);

    if (consultRes.error) console.error("[PaiementsPage] erreur consultations :", consultRes.error.message);
    if (batchesRes.error) console.error("[PaiementsPage] erreur lots :", batchesRes.error.message);

    const batchIds = (batchesRes.data ?? []).map((b: any) => b.id);
    const batchedIds = new Set<string>();
    if (batchIds.length > 0) {
      const { data: items, error: itemsErr } = await supabase
        .from("batch_items")
        .select("consultation_id")
        .in("batch_id", batchIds);
      if (itemsErr) console.error("[PaiementsPage] erreur batch_items :", itemsErr.message);
      for (const it of items ?? []) if (it.consultation_id) batchedIds.add(it.consultation_id);
    }

    setPending(((consultRes.data ?? []) as any[]).filter((c) => !batchedIds.has(c.id)));
    setBatches((batchesRes.data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.insurerId]);

  const pendingByClinic = useMemo(() => {
    const map = new Map<
      string,
      { clinicId: string; name: string; count: number; amount: number; notPriced: number }
    >();
    for (const c of pending) {
      const key = c.clinic_id ?? "unknown";
      const entry =
        map.get(key) ?? { clinicId: key, name: c.clinic?.name ?? "Clinique inconnue", count: 0, amount: 0, notPriced: 0 };
      if (c.pricing_status === "computed") {
        entry.count += 1;
        entry.amount += c.insurer_amount ?? 0;
      } else {
        entry.notPriced += 1;
      }
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [pending]);

  const filteredBatches = useMemo(() => {
    if (batchFilter === "all") return batches;
    return batches.filter((b) => (b.status ?? "pending") === batchFilter);
  }, [batches, batchFilter]);

  const batchCounts = useMemo(() => {
    const paid = batches.filter((b) => b.status === "paid").length;
    return { all: batches.length, paid, pending: batches.length - paid };
  }, [batches]);

  const callFunction = async (name: string, body: unknown) => {
    const token = await getToken();
    const res = await fetch(`${FUNCTIONS_BASE}/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Erreur ${name}.`);
    return json;
  };

  const handleGenerate = async (clinicId: string) => {
    setGeneratingClinicId(clinicId);
    try {
      const json = await callFunction("generate-payment-batch", { clinicId });
      if (!json.batches || json.batches.length === 0) {
        toast.info(json.message || "Aucune consultation prête à être regroupée.");
      } else {
        const b = json.batches[0];
        toast.success(`Lot généré : ${b.count} consultation(s), ${b.amount.toLocaleString()} FCFA.`);
      }
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erreur génération du lot.");
    } finally {
      setGeneratingClinicId(null);
    }
  };

  const handleMarkPaid = async (batchId: string) => {
    if (!window.confirm("Confirmer que ce lot a bien été payé à la clinique ?")) return;
    setMarkingBatchId(batchId);
    try {
      await callFunction("mark-payment-batch-paid", { batchId });
      toast.success("Lot marqué payé.");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erreur lors du marquage.");
    } finally {
      setMarkingBatchId(null);
    }
  };

  const handleExport = async (status: "pending" | "paid") => {
    setExporting(status);
    try {
      const token = await getToken();
      const res = await fetch(`${FUNCTIONS_BASE}/export-payment-csv`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erreur export.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `paiements-${status}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e.message || "Erreur export.");
    } finally {
      setExporting(null);
    }
  };

  if (ctxLoading || loading) return <p>Chargement...</p>;
  if (!ctx) return <p className="text-red-600">Impossible de déterminer votre compte assureur.</p>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Paiements</h2>
        <p className="text-sm text-gray-500">
          Regroupez les consultations validées par clinique, puis générez et suivez vos lots de paiement.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="font-semibold text-lg">À regrouper</h3>
        {pendingByClinic.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune consultation en attente de regroupement.</p>
        ) : (
          <div className="space-y-2">
            {pendingByClinic.map((c) => (
              <Card key={c.clinicId} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-gray-500">
                    {c.count} consultation{c.count > 1 ? "s" : ""} prête{c.count > 1 ? "s" : ""} •{" "}
                    {c.amount.toLocaleString()} FCFA
                    {c.notPriced > 0 && (
                      <span className="text-orange-600">
                        {" "}
                        • {c.notPriced} en attente de tarification (à recalculer sur Rapports)
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  className="bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                  onClick={() => handleGenerate(c.clinicId)}
                  disabled={c.count === 0 || generatingClinicId === c.clinicId}
                >
                  {generatingClinicId === c.clinicId ? "..." : "Générer le lot"}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-lg">Lots de paiement</h3>
          <div className="flex gap-2 flex-wrap">
            <Button
              className={batchFilter === "all" ? "bg-black text-white" : "bg-white text-gray-900 border"}
              onClick={() => setBatchFilter("all")}
            >
              Tous ({batchCounts.all})
            </Button>
            <Button
              className={batchFilter === "pending" ? "bg-yellow-600 text-white" : "bg-white text-gray-900 border"}
              onClick={() => setBatchFilter("pending")}
            >
              En attente ({batchCounts.pending})
            </Button>
            <Button
              className={batchFilter === "paid" ? "bg-green-600 text-white" : "bg-white text-gray-900 border"}
              onClick={() => setBatchFilter("paid")}
            >
              Payés ({batchCounts.paid})
            </Button>
            <Button
              className="bg-white text-gray-900 border hover:bg-gray-50 disabled:opacity-50"
              onClick={() => handleExport("pending")}
              disabled={exporting === "pending"}
            >
              {exporting === "pending" ? "..." : "Exporter en attente (CSV)"}
            </Button>
            <Button
              className="bg-white text-gray-900 border hover:bg-gray-50 disabled:opacity-50"
              onClick={() => handleExport("paid")}
              disabled={exporting === "paid"}
            >
              {exporting === "paid" ? "..." : "Exporter payés (CSV)"}
            </Button>
          </div>
        </div>

        {filteredBatches.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun lot sur ce filtre.</p>
        ) : (
          <div className="space-y-2">
            {filteredBatches.map((b) => {
              const isPaid = b.status === "paid";
              return (
                <Card key={b.id} className={`p-4 border-l-4 ${isPaid ? "border-green-500" : "border-yellow-400"}`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm">
                      <p className="font-medium">{b.clinic?.name ?? "—"}</p>
                      <p className="text-gray-500">
                        {b.consultation_count ?? "—"} consultation(s) •{" "}
                        {(b.total_paid ?? b.amount ?? 0).toLocaleString()} FCFA
                        {b.period_start || b.period_end ? (
                          <> • Période {b.period_start ?? "—"} → {b.period_end ?? "—"}</>
                        ) : null}
                      </p>
                      <p className="text-xs text-gray-400">
                        Créé le {b.created_at ? new Date(b.created_at).toLocaleDateString("fr-FR") : "—"}
                        {isPaid && b.paid_at ? <> • Payé le {new Date(b.paid_at).toLocaleDateString("fr-FR")}</> : null}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${
                          isPaid ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {isPaid ? "Payé" : "En attente"}
                      </span>
                      {!isPaid && canMarkPaid && (
                        <Button
                          className="bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          onClick={() => handleMarkPaid(b.id)}
                          disabled={markingBatchId === b.id}
                        >
                          {markingBatchId === b.id ? "..." : "Marquer payé"}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
