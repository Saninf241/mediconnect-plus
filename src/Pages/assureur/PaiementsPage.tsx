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
  payment_dispute_status: string | null;
  created_at: string | null;
  clinic: { name: string | null } | null;
  patients: { name: string | null } | null;
};

type Batch = {
  id: string;
  clinic_id: string | null;
  amount: number | null;
  commission: number | null;
  total_paid: number | null;
  status: string | null;
  period_start: string | null;
  period_end: string | null;
  consultation_count: number | null;
  created_at: string | null;
  paid_at: string | null;
  paid_by_email: string | null;
  clinic: { name: string | null } | null;
  created_by: { email: string | null } | { email: string | null }[] | null;
};

type BatchItemDetail = {
  consultation_id: string;
  insurer_amount: number | null;
  pricing_status: string | null;
  payment_dispute_status: string | null;
  payment_dispute_reason: string | null;
  created_at: string | null;
  patients: { name: string | null } | { name: string | null }[] | null;
};

type ManualPricingInfo = {
  consultation_id: string;
  proposed_by_email: string | null;
  approved_by_email: string | null;
};

type PendingProposal = {
  id: string;
  consultation_id: string;
  proposed_amount: number;
  justification: string | null;
  proposed_by_email: string | null;
  proposed_at: string | null;
  consultations: {
    patients: { name: string | null } | { name: string | null }[] | null;
    clinic: { name: string | null } | { name: string | null }[] | null;
  } | {
    patients: { name: string | null } | { name: string | null }[] | null;
    clinic: { name: string | null } | { name: string | null }[] | null;
  }[] | null;
};

type ClinicPaymentInfo = {
  clinic_id: string;
  payment_method: "bank_transfer" | "mobile_money" | null;
  bank_name: string | null;
  account_number: string | null;
  account_holder_name: string | null;
  mobile_money_provider: string | null;
  mobile_money_number: string | null;
  status: string | null;
};

type BatchFilter = "all" | "pending" | "paid";

function firstOf<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export default function PaiementsPage() {
  const { ctx, loading: ctxLoading } = useInsurerContext();
  const { getToken } = useAuth();

  const [pending, setPending] = useState<PendingConsultation[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [proposals, setProposals] = useState<PendingProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [batchFilter, setBatchFilter] = useState<BatchFilter>("all");
  const [generatingClinicId, setGeneratingClinicId] = useState<string | null>(null);
  const [markingBatchId, setMarkingBatchId] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [batchDetails, setBatchDetails] = useState<Record<string, BatchItemDetail[]>>({});
  const [manualPricingByConsult, setManualPricingByConsult] = useState<Record<string, ManualPricingInfo>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [paymentInfoByClinic, setPaymentInfoByClinic] = useState<Record<string, ClinicPaymentInfo>>({});
  const [payingBatchId, setPayingBatchId] = useState<string | null>(null);

  const canMarkPaid = ctx?.role === "admin";

  const load = async () => {
    if (!ctx) return;
    setLoading(true);

    const [consultRes, batchesRes, proposalsRes] = await Promise.all([
      supabase
        .from("consultations")
        .select(
          "id, clinic_id, insurer_amount, pricing_status, payment_dispute_status, created_at, clinic:clinic_id(name), patients:patient_id(name)"
        )
        .eq("insurer_id", ctx.insurerId)
        .eq("status", "accepted"),
      supabase
        .from("payment_batches")
        .select(
          "id, clinic_id, amount, commission, total_paid, status, period_start, period_end, consultation_count, created_at, paid_at, paid_by_email, clinic:clinic_id(name), created_by:created_by_staff_id(email)"
        )
        .eq("insurer_id", ctx.insurerId)
        .order("created_at", { ascending: false }),
      supabase
        .from("consultation_manual_pricing")
        .select(
          "id, consultation_id, proposed_amount, justification, proposed_by_email, proposed_at, consultations:consultation_id(patients:patient_id(name), clinic:clinic_id(name))"
        )
        .eq("insurer_id", ctx.insurerId)
        .eq("status", "pending")
        .order("proposed_at", { ascending: false }),
    ]);

    if (consultRes.error) console.error("[PaiementsPage] erreur consultations :", consultRes.error.message);
    if (batchesRes.error) console.error("[PaiementsPage] erreur lots :", batchesRes.error.message);
    if (proposalsRes.error) console.error("[PaiementsPage] erreur propositions :", proposalsRes.error.message);
    setProposals((proposalsRes.data ?? []) as any);

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

    // Coordonnees de paiement verifiees des cabinets ayant au moins un lot
    // -- necessaires pour decider si un paiement automatique (mobile
    // money) est possible, ou pour afficher de quoi faire un virement
    // manuel. La RLS ne renvoie que les lignes verifiees et liees a cet
    // assureur (cf. migration 20260727130000).
    const clinicIds = Array.from(new Set((batchesRes.data ?? []).map((b: any) => b.clinic_id).filter(Boolean)));
    if (clinicIds.length > 0) {
      const { data: paymentInfoRows, error: paymentInfoErr } = await supabase
        .from("clinic_payment_info")
        .select(
          "clinic_id, payment_method, bank_name, account_number, account_holder_name, mobile_money_provider, mobile_money_number, status"
        )
        .in("clinic_id", clinicIds);
      if (paymentInfoErr) console.error("[PaiementsPage] erreur coordonnées de paiement :", paymentInfoErr.message);
      const map: Record<string, ClinicPaymentInfo> = {};
      for (const r of (paymentInfoRows ?? []) as ClinicPaymentInfo[]) map[r.clinic_id] = r;
      setPaymentInfoByClinic(map);
    } else {
      setPaymentInfoByClinic({});
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.insurerId]);

  const pendingByClinic = useMemo(() => {
    const map = new Map<
      string,
      {
        clinicId: string;
        name: string;
        count: number;
        amount: number;
        notPriced: { id: string; patientName: string; date: string }[];
        disputed: { id: string; patientName: string; date: string }[];
      }
    >();
    for (const c of pending) {
      const key = c.clinic_id ?? "unknown";
      const entry =
        map.get(key) ??
        { clinicId: key, name: c.clinic?.name ?? "Clinique inconnue", count: 0, amount: 0, notPriced: [], disputed: [] };
      if (c.payment_dispute_status === "open") {
        entry.disputed.push({
          id: c.id,
          patientName: c.patients?.name ?? "Patient inconnu",
          date: c.created_at ? new Date(c.created_at).toLocaleDateString("fr-FR") : "—",
        });
      } else if (c.pricing_status === "computed" || c.pricing_status === "manual_approved") {
        entry.count += 1;
        entry.amount += c.insurer_amount ?? 0;
      } else {
        entry.notPriced.push({
          id: c.id,
          patientName: c.patients?.name ?? "Patient inconnu",
          date: c.created_at ? new Date(c.created_at).toLocaleDateString("fr-FR") : "—",
        });
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
      if (json.race_conflicts > 0) {
        toast.warning(
          `${json.race_conflicts} clinique(s) ignorée(s) — une ou plusieurs consultations venaient d'être regroupées par un autre agent au même moment. Réessayez si besoin.`
        );
      }
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erreur génération du lot.");
    } finally {
      setGeneratingClinicId(null);
    }
  };

  const toggleBatchDetail = async (batchId: string) => {
    if (expandedBatchId === batchId) {
      setExpandedBatchId(null);
      return;
    }
    setExpandedBatchId(batchId);
    if (batchDetails[batchId]) return;

    setLoadingDetailId(batchId);
    try {
      const { data: items, error } = await supabase
        .from("batch_items")
        .select(
          "consultation_id, consultations:consultation_id(insurer_amount, pricing_status, payment_dispute_status, payment_dispute_reason, created_at, patients:patient_id(name))"
        )
        .eq("batch_id", batchId);

      if (error) throw error;

      const details: BatchItemDetail[] = ((items ?? []) as any[]).map((it) => {
        const c = firstOf(it.consultations) ?? {};
        return {
          consultation_id: it.consultation_id,
          insurer_amount: c.insurer_amount ?? null,
          pricing_status: c.pricing_status ?? null,
          payment_dispute_status: c.payment_dispute_status ?? null,
          payment_dispute_reason: c.payment_dispute_reason ?? null,
          created_at: c.created_at ?? null,
          patients: c.patients ?? null,
        };
      });
      setBatchDetails((prev) => ({ ...prev, [batchId]: details }));

      const manualIds = details
        .filter((d) => d.pricing_status === "manual_approved")
        .map((d) => d.consultation_id);
      if (manualIds.length > 0) {
        const { data: manualRows, error: manualErr } = await supabase
          .from("consultation_manual_pricing")
          .select("consultation_id, proposed_by_email, approved_by_email")
          .in("consultation_id", manualIds)
          .eq("status", "approved");
        if (manualErr) console.error("[PaiementsPage] erreur tarifs manuels :", manualErr.message);
        const map: Record<string, ManualPricingInfo> = {};
        for (const r of (manualRows ?? []) as any[]) map[r.consultation_id] = r;
        setManualPricingByConsult((prev) => ({ ...prev, ...map }));
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur chargement du détail du lot.");
    } finally {
      setLoadingDetailId(null);
    }
  };

  const handlePayViaGateway = async (batchId: string) => {
    if (!window.confirm("Déclencher le paiement mobile money pour ce lot ?")) return;
    setPayingBatchId(batchId);
    try {
      const json = await callFunction("initiate-payment-batch-payout", { batchId });
      toast.success(
        json.simulated
          ? `Paiement simulé effectué (aucun prestataire réel branché) — réf. ${json.providerReference}.`
          : `Paiement envoyé — réf. ${json.providerReference}.`
      );
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erreur lors du déclenchement du paiement.");
    } finally {
      setPayingBatchId(null);
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

      {proposals.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold text-lg">
            Propositions de tarification en attente ({proposals.length})
          </h3>
          <p className="text-sm text-gray-500">
            Montants proposés manuellement par un agent — à valider avant qu'ils ne soient inclus dans un lot.
          </p>
          <div className="space-y-2">
            {proposals.map((p) => {
              const c = firstOf(p.consultations);
              const patientName = firstOf(c?.patients)?.name ?? "Patient inconnu";
              const clinicName = firstOf(c?.clinic)?.name ?? "Clinique inconnue";
              return (
                <Card key={p.id} className="p-4 border-l-4 border-amber-400">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm">
                      <p className="font-medium">
                        {patientName} • {clinicName}
                      </p>
                      <p className="text-gray-500">
                        Montant proposé : {p.proposed_amount.toLocaleString("fr-FR")} FCFA
                        {p.proposed_by_email ? ` • par ${p.proposed_by_email}` : ""}
                        {p.proposed_at ? ` • ${new Date(p.proposed_at).toLocaleDateString("fr-FR")}` : ""}
                      </p>
                      {p.justification && (
                        <p className="text-xs text-gray-400 italic">« {p.justification} »</p>
                      )}
                    </div>
                    <Button
                      className="bg-white text-gray-900 border hover:bg-gray-50"
                      onClick={() =>
                        window.open(`/assureur/consultations/${encodeURIComponent(p.consultation_id)}`, "_blank")
                      }
                    >
                      {canMarkPaid ? "Examiner" : "Voir"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h3 className="font-semibold text-lg">À regrouper</h3>
        {pendingByClinic.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune consultation en attente de regroupement.</p>
        ) : (
          <div className="space-y-2">
            {pendingByClinic.map((c) => (
              <Card key={c.clinicId} className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-gray-500">
                      {c.count} consultation{c.count > 1 ? "s" : ""} prête{c.count > 1 ? "s" : ""} •{" "}
                      {c.amount.toLocaleString()} FCFA
                    </p>
                  </div>
                  <Button
                    className="bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                    onClick={() => handleGenerate(c.clinicId)}
                    disabled={c.count === 0 || generatingClinicId === c.clinicId}
                  >
                    {generatingClinicId === c.clinicId ? "..." : "Générer le lot"}
                  </Button>
                </div>

                {c.notPriced.length > 0 && (
                  <div className="text-xs text-orange-700 bg-orange-50 rounded p-2 space-y-1">
                    <p className="font-medium">
                      {c.notPriced.length} consultation{c.notPriced.length > 1 ? "s" : ""} à tarifer avant de
                      pouvoir les inclure dans un lot :
                    </p>
                    <div className="flex flex-col gap-1">
                      {c.notPriced.map((nc) => (
                        <button
                          key={nc.id}
                          className="text-left underline hover:text-orange-900"
                          onClick={() => window.open(`/assureur/consultations/${encodeURIComponent(nc.id)}`, "_blank")}
                        >
                          {nc.patientName} — {nc.date}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {c.disputed.length > 0 && (
                  <div className="text-xs text-red-700 bg-red-50 rounded p-2 space-y-1">
                    <p className="font-medium">
                      {c.disputed.length} consultation{c.disputed.length > 1 ? "s" : ""} en litige avec la clinique —
                      exclue{c.disputed.length > 1 ? "s" : ""} du lot tant que non résolue{c.disputed.length > 1 ? "s" : ""} :
                    </p>
                    <div className="flex flex-col gap-1">
                      {c.disputed.map((nc) => (
                        <button
                          key={nc.id}
                          className="text-left underline hover:text-red-900"
                          onClick={() => window.open(`/assureur/consultations/${encodeURIComponent(nc.id)}`, "_blank")}
                        >
                          {nc.patientName} — {nc.date}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
                        {(b.amount ?? 0).toLocaleString()} FCFA
                        {b.period_start || b.period_end ? (
                          <> • Période {b.period_start ?? "—"} → {b.period_end ?? "—"}</>
                        ) : null}
                      </p>
                      <p className="text-xs text-gray-500">
                        Commission Mediconnect+ (1,5%) : {(b.commission ?? 0).toLocaleString()} FCFA • Net clinique :{" "}
                        {(b.total_paid ?? 0).toLocaleString()} FCFA
                      </p>
                      {(() => {
                        const info = b.clinic_id ? paymentInfoByClinic[b.clinic_id] : undefined;
                        if (!info) {
                          return (
                            <p className="text-xs text-red-600 mt-1">
                              ⚠️ Aucun moyen de paiement vérifié pour ce cabinet — paiement automatique impossible.
                            </p>
                          );
                        }
                        return (
                          <p className="text-xs text-gray-500 mt-1">
                            Destination :{" "}
                            {info.payment_method === "mobile_money"
                              ? `${info.mobile_money_provider ?? "Mobile money"} — ${info.mobile_money_number ?? "—"}`
                              : `Virement — ${info.bank_name ?? "—"} — ${info.account_number ?? "—"} (${
                                  info.account_holder_name ?? "—"
                                })`}
                            {" "}(vérifié)
                          </p>
                        );
                      })()}
                      <p className="text-xs text-gray-400">
                        Créé le {b.created_at ? new Date(b.created_at).toLocaleDateString("fr-FR") : "—"}
                        {firstOf(b.created_by)?.email ? ` par ${firstOf(b.created_by)?.email}` : ""}
                        {isPaid && b.paid_at ? (
                          <>
                            {" "}
                            • Payé le {new Date(b.paid_at).toLocaleDateString("fr-FR")}
                            {b.paid_by_email ? ` par ${b.paid_by_email}` : ""}
                          </>
                        ) : null}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${
                          isPaid ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {isPaid ? "Payé" : "En attente"}
                      </span>
                      <Button
                        className="bg-white text-gray-900 border hover:bg-gray-50"
                        onClick={() => toggleBatchDetail(b.id)}
                      >
                        {expandedBatchId === b.id ? "Masquer le détail" : "Voir le détail"}
                      </Button>
                      {!isPaid && canMarkPaid && b.clinic_id && paymentInfoByClinic[b.clinic_id]?.payment_method === "mobile_money" && (
                        <Button
                          className="bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                          onClick={() => handlePayViaGateway(b.id)}
                          disabled={payingBatchId === b.id}
                          title="Aucun prestataire réel branché pour l'instant — le paiement sera simulé."
                        >
                          {payingBatchId === b.id ? "..." : "Payer via mobile money"}
                        </Button>
                      )}
                      {!isPaid && canMarkPaid && (
                        <Button
                          className="bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          onClick={() => handleMarkPaid(b.id)}
                          disabled={markingBatchId === b.id}
                        >
                          {markingBatchId === b.id ? "..." : "Marquer payé manuellement"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {expandedBatchId === b.id && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      {loadingDetailId === b.id ? (
                        <p className="text-sm text-gray-500">Chargement du détail...</p>
                      ) : (batchDetails[b.id] ?? []).length === 0 ? (
                        <p className="text-sm text-gray-500">Aucune consultation trouvée pour ce lot.</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-500">
                              <th className="py-1 pr-4">Patient</th>
                              <th className="py-1 pr-4">Date</th>
                              <th className="py-1 pr-4">Montant</th>
                              <th className="py-1 pr-4">Tarification</th>
                              <th className="py-1 pr-4"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {(batchDetails[b.id] ?? []).map((d) => {
                              const manual = manualPricingByConsult[d.consultation_id];
                              return (
                                <tr key={d.consultation_id} className="border-t">
                                  <td className="py-1.5 pr-4">
                                    {firstOf(d.patients)?.name ?? "Patient inconnu"}
                                  </td>
                                  <td className="py-1.5 pr-4">
                                    {d.created_at ? new Date(d.created_at).toLocaleDateString("fr-FR") : "—"}
                                  </td>
                                  <td className="py-1.5 pr-4">
                                    {(d.insurer_amount ?? 0).toLocaleString("fr-FR")} FCFA
                                  </td>
                                  <td className="py-1.5 pr-4">
                                    <div className="flex flex-col gap-1">
                                      {d.pricing_status === "manual_approved" ? (
                                        <span className="text-xs text-amber-700" title={
                                          manual
                                            ? `Proposé par ${manual.proposed_by_email ?? "?"}, validé par ${manual.approved_by_email ?? "?"}`
                                            : undefined
                                        }>
                                          Montant ajusté manuellement
                                          {manual?.approved_by_email ? ` (validé par ${manual.approved_by_email})` : ""}
                                        </span>
                                      ) : (
                                        <span className="text-xs text-gray-500">Calcul automatique</span>
                                      )}
                                      {d.payment_dispute_status === "open" && (
                                        <span className="text-xs font-medium text-red-700" title={d.payment_dispute_reason ?? undefined}>
                                          ⚠️ Contesté par la clinique
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-1.5 pr-4">
                                    <button
                                      className="text-xs text-blue-600 underline"
                                      onClick={() =>
                                        window.open(
                                          `/assureur/consultations/${encodeURIComponent(d.consultation_id)}`,
                                          "_blank"
                                        )
                                      }
                                    >
                                      Ouvrir
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
