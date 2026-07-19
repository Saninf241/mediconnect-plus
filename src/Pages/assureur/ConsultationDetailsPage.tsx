// src/Pages/assureur/ConsultationDetailsPage.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useUser, useAuth } from "@clerk/clerk-react";
import ConsultationChat from "../../components/ui/assureur/ConsultationChat";
import { generateConsultationPdf } from "../../lib/api/generateConsultationPdf";

interface ConsultationRow {
  id: string;
  created_at: string;
  amount: number | null;
  status: string;
  pdf_url: string | null;
  patient_id: string | null;
  insurer_comment: string | null;
  insurer_decision_at: string | null;
  insurer_decision_by_email: string | null;
  pricing_status: string | null;
  pricing_total: number | null;
  amount_delta: number | null;
  insurer_amount: number | null;
  patient_amount: number | null;
  missing_tariffs: number | null;

  clinic:
    | { name: string | null }
    | { name: string | null }[]
    | null;

  doctor_id: string | null;

  diagnosis_code_text: string | null;
  diagnosis_code:
    | { code: string | null; title: string | null }
    | { code: string | null; title: string | null }[]
    | null;
}

interface PatientRow {
  id: string;
  name: string | null;
  is_assured: boolean | null;
}

interface MembershipRow {
  member_no: string | null;
  plan_code: string | null;
  insurer:
    | { name: string | null }
    | { name: string | null }[]
    | null;
}

interface ManualPricingRow {
  id: string;
  proposed_amount: number;
  justification: string | null;
  status: "pending" | "approved" | "rejected";
  proposed_by_email: string | null;
  proposed_at: string | null;
  approved_by_email: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
}

const FUNCTIONS_BASE = "https://zwxegqevthzfphdqtjew.supabase.co/functions/v1";

export default function AssureurConsultationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();

  const [consultation, setConsultation] = useState<ConsultationRow | null>(null);
  const [doctorName, setDoctorName] = useState<string | null>(null);
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [membership, setMembership] = useState<MembershipRow | null>(null);
  const [insurerAgentId, setInsurerAgentId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const [tariffContext, setTariffContext] = useState<"private_weekday" | "private_weekend">("private_weekday");
  const [coverageCase, setCoverageCase] = useState<"acute" | "chronic">("acute");

  const [pricingComputing, setPricingComputing] = useState(false);

  // Surcharge manuelle du montant (quand le calcul auto est bloque ou juge errone)
  const [manualPricing, setManualPricing] = useState<ManualPricingRow | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualAmount, setManualAmount] = useState("");
  const [manualJustification, setManualJustification] = useState("");
  const [submittingManual, setSubmittingManual] = useState(false);
  const [reviewingManual, setReviewingManual] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  // ✅ IMPORTANT : fetchDetails doit être réutilisable (PDF regen)
  const fetchDetails = useCallback(async () => {
    if (!id) return;

    setLoading(true);

    // 1) Consultation + jointures
    const { data: consult, error: cError } = await supabase
      .from("consultations")
      .select(
        `
        id,
        created_at,
        amount,
        status,
        pdf_url,
        pricing_status,
        pricing_total,
        amount_delta,
        insurer_amount,
        patient_amount,
        missing_tariffs,
        biometric_verified_at,
        biometric_operator_id,
        biometric_clinic_id,
        fingerprint_missing,
        patient_id,
        insurer_comment,
        insurer_decision_at,
        insurer_decision_by_email,
        diagnosis_code_text,
        diagnosis_code:diagnosis_codes ( code, title ),
        clinic:clinics ( name ),
        doctor_id
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (cError || !consult) {
      console.error("[AssureurDetails] error consultation:", cError);
      setLoading(false);
      return;
    }

    setConsultation(consult as ConsultationRow);

    // Nom du médecin via RPC dédiée -- un embed direct consultations+
    // clinic_staff dans une même requête fonctionne, mais clinic_staff
    // n'a plus de policy RLS générique pour l'assureur (supprimée : elle
    // provoquait une récursion RLS sur TOUTE mise à jour de consultations,
    // cf. migration 20260718110000).
    const { data: doctorNameData, error: doctorNameError } = await supabase.rpc(
      "insurer_get_doctor_name",
      { p_consultation_id: id }
    );
    if (doctorNameError) console.error("[AssureurDetails] error doctor name:", doctorNameError);
    else setDoctorName(doctorNameData ?? null);

    // 2) Patient
    if (consult.patient_id) {
      const { data: patientData, error: pError } = await supabase
        .from("patients")
        .select("id, name, is_assured")
        .eq("id", consult.patient_id)
        .maybeSingle();

      if (pError) {
        console.error("[AssureurDetails] error patient:", pError);
      } else if (patientData) {
        setPatient(patientData as PatientRow);
      }

      // 3) Dernière affiliation assureur
      const { data: membershipData, error: mError } = await supabase
        .from("insurer_memberships")
        .select(
          `
          member_no,
          plan_code,
          insurer:insurers ( name )
        `
        )
        .eq("patient_id", consult.patient_id)
        .order("last_verified_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (mError) {
        console.error("[AssureurDetails] error membership:", mError);
      } else if (membershipData) {
        setMembership(membershipData as MembershipRow);
      }
    }

    // 4) Récupérer insurer_agent via Clerk → insurer_staff
    if (user?.id) {
      const { data: staffRow, error: staffError } = await supabase
        .from("insurer_staff")
        .select("id, role")
        .eq("clerk_user_id", user.id)
        .maybeSingle();

      if (staffError) {
        console.error("[AssureurDetails] erreur insurer_staff:", staffError);
      } else if (staffRow?.id) {
        setInsurerAgentId(staffRow.id);
        setMyRole(staffRow.role ?? null);
      }
    }

    // 5) Proposition de tarification manuelle existante (le cas échéant)
    const { data: manualRow, error: manualErr } = await supabase
      .from("consultation_manual_pricing")
      .select(
        "id, proposed_amount, justification, status, proposed_by_email, proposed_at, approved_by_email, approved_at, rejection_reason"
      )
      .eq("consultation_id", id)
      .maybeSingle();

    if (manualErr) console.error("[AssureurDetails] erreur manual pricing:", manualErr);
    setManualPricing((manualRow as ManualPricingRow) ?? null);

    setLoading(false);
  }, [id, user?.id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleRegeneratePdfWithPricing = async () => {
    if (!consultation?.id) return;

    setRegenerating(true);
    setPricingComputing(true);

    try {
      // 1) Compute pricing (écrit dans consultations)
      const { data: pricingRes, error: rpcErr } = await supabase.rpc(
        "compute_consultation_pricing",
        {
          p_consultation_id: consultation.id,
          p_context: tariffContext,   // enum tariff_context
          p_case: coverageCase,       // enum coverage_case
        }
      );

      if (rpcErr) {
        console.error("[Pricing RPC] error:", rpcErr);
        alert("Impossible de calculer le pricing.");
        return;
      }

      console.log("[Pricing RPC] result:", pricingRes);

      // 2) Régénérer PDF (qui va lire les colonnes pricing_* en DB)
      const token = await getToken();
      const res = await fetch(
        "https://zwxegqevthzfphdqtjew.supabase.co/functions/v1/generate-consultation-pdf",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            consultationId: consultation.id,
            pricing_context: tariffContext,
            coverage_case: coverageCase,
          }),
        }
      );

      if (!res.ok) {
        const txt = await res.text();
        console.error("[RegeneratePDF] HTTP error:", res.status, txt);
        alert("Impossible de régénérer le PDF.");
        return;
      }

      await fetchDetails();
      alert("Pricing calculé + PDF régénéré ✅");
    } catch (e) {
      console.error("[RegeneratePDFWithPricing] unexpected:", e);
      alert("Erreur réseau / inattendue.");
    } finally {
      setPricingComputing(false);
      setRegenerating(false);
    }
  };

  const callFunction = async (path: string, body: unknown) => {
    const token = await getToken();
    const res = await fetch(`${FUNCTIONS_BASE}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Erreur ${path}.`);
    return json;
  };

  const handleSubmitManualPricing = async () => {
    if (!consultation?.id) return;
    const amount = Number(manualAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      alert("Montant invalide.");
      return;
    }
    setSubmittingManual(true);
    try {
      await callFunction("propose-manual-pricing", {
        consultation_id: consultation.id,
        proposed_amount: amount,
        justification: manualJustification,
      });
      setShowManualForm(false);
      setManualAmount("");
      setManualJustification("");
      await fetchDetails();
    } catch (e: any) {
      alert(e.message || "Erreur lors de la soumission.");
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleApproveManualPricing = async () => {
    if (!manualPricing || !consultation?.id) return;
    if (!window.confirm(`Approuver le montant manuel de ${manualPricing.proposed_amount.toLocaleString("fr-FR")} FCFA ?`)) return;
    setReviewingManual(true);
    try {
      await callFunction("review-manual-pricing", { manual_pricing_id: manualPricing.id, decision: "approve" });
      // Trace claire : régénère le PDF avec le nouveau montant approuvé.
      const token = await getToken();
      await generateConsultationPdf(consultation.id, token);
      await fetchDetails();
      alert("Montant approuvé et PDF régénéré ✅");
    } catch (e: any) {
      alert(e.message || "Erreur lors de l'approbation.");
    } finally {
      setReviewingManual(false);
    }
  };

  const handleRejectManualPricing = async () => {
    if (!manualPricing || !rejectReason.trim()) return;
    setReviewingManual(true);
    try {
      await callFunction("review-manual-pricing", {
        manual_pricing_id: manualPricing.id,
        decision: "reject",
        rejection_reason: rejectReason,
      });
      setShowRejectForm(false);
      setRejectReason("");
      await fetchDetails();
    } catch (e: any) {
      alert(e.message || "Erreur lors du rejet.");
    } finally {
      setReviewingManual(false);
    }
  };

  if (loading) return <p className="p-6">Chargement...</p>;
  if (!consultation) return <p className="p-6">Consultation introuvable</p>;

  // Helpers pour les noms (objet OU tableau)
  const clinicName = consultation.clinic
    ? Array.isArray(consultation.clinic)
      ? consultation.clinic[0]?.name ?? "—"
      : consultation.clinic.name ?? "—"
    : "—";

  const doctorLabel = doctorName ?? "—";

  const doctorStaffId = consultation.doctor_id ?? null;

  const patientName = patient?.name ?? "—";

  const insurerName = membership?.insurer
    ? Array.isArray(membership.insurer)
      ? membership.insurer[0]?.name ?? "—"
      : membership.insurer.name ?? "—"
    : "—";

  const diagnosisLabel =
    consultation.diagnosis_code_text?.trim() ||
    (() => {
      const dc = consultation.diagnosis_code;
      const row = Array.isArray(dc) ? dc[0] : dc;
      if (!row) return "—";
      const code = row.code ?? "";
      const title = row.title ?? "";
      const txt = `${code} - ${title}`.trim();
      return txt || "—";
    })();

  const memberNo = membership?.member_no ?? "—";
  const planCode = membership?.plan_code ?? "—";
  const decisionDate = consultation.insurer_decision_at
    ? new Date(consultation.insurer_decision_at).toLocaleString()
    : "—";

  const prettyTitle =
    patientName !== "—"
      ? `Consultation – ${patientName}`
      : `Consultation #${consultation.id.slice(0, 8)}…`;

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-blue-600 underline mb-4"
      >
        ← Retour aux rapports
      </button>

      <h1 className="text-2xl font-bold">{prettyTitle}</h1>

      <div className="bg-white shadow rounded p-4 space-y-2 border">
        <p>
          <strong>Date :</strong>{" "}
          {new Date(consultation.created_at).toLocaleString()}
        </p>
        <p>
          <strong>Montant :</strong>{" "}
          {consultation.amount != null
            ? `${consultation.amount.toLocaleString("fr-FR")} FCFA`
            : "—"}
        </p>
        <p>
          <strong>Statut :</strong> {consultation.status}
        </p>

        <div className="mt-3 p-3 rounded border bg-gray-50">
          <p className="font-semibold">Tarification (calcul Mediconnect+)</p>

          <div className="text-sm mt-2 space-y-1">
            <p><strong>Montant déclaré :</strong> {consultation.amount?.toLocaleString("fr-FR") ?? "—"} FCFA</p>
            <p><strong>Total calculé :</strong> {consultation.pricing_total?.toLocaleString("fr-FR") ?? "—"} FCFA</p>
            <p><strong>Part assureur :</strong> {consultation.insurer_amount?.toLocaleString("fr-FR") ?? "—"} FCFA</p>
            <p><strong>Reste patient :</strong> {consultation.patient_amount?.toLocaleString("fr-FR") ?? "—"} FCFA</p>

            {typeof consultation.amount_delta === "number" && (
              <p>
                <strong>Δ (déclaré - calculé) :</strong>{" "}
                {consultation.amount_delta.toLocaleString("fr-FR")} FCFA
              </p>
            )}

            {typeof consultation.missing_tariffs === "number" && consultation.missing_tariffs > 0 && (
              <p className="text-orange-700">
                ⚠️ Tarifs manquants : {consultation.missing_tariffs}
              </p>
            )}

            <p className="text-xs text-gray-600">
              Contexte: {tariffContext} • Cas: {coverageCase}
            </p>
          </div>

          <div className="flex gap-2 mt-3">
            <select
              className="border rounded px-2 py-1 text-sm"
              value={tariffContext}
              onChange={(e) => setTariffContext(e.target.value as any)}
            >
              <option value="private_weekday">Privé – semaine</option>
              <option value="private_weekend">Privé – week-end</option>
            </select>

            <select
              className="border rounded px-2 py-1 text-sm"
              value={coverageCase}
              onChange={(e) => setCoverageCase(e.target.value as any)}
            >
              <option value="acute">Aigu</option>
              <option value="chronic">Chronique</option>
            </select>
          </div>
        </div>

        <div className="mt-3 p-3 rounded border bg-amber-50">
          <p className="font-semibold">Tarification manuelle</p>
          <p className="text-xs text-gray-600 mb-2">
            Si le calcul automatique est bloqué (acte non tarifable, tarif manquant) ou vous semble erroné,
            proposez un montant — il devra être validé par un administrateur de l'assureur avant de devenir actif.
          </p>

          {!manualPricing || manualPricing.status === "rejected" ? (
            <>
              {manualPricing?.status === "rejected" && (
                <p className="text-sm text-red-700 bg-red-100 rounded p-2 mb-2">
                  Précédente proposition rejetée — motif : {manualPricing.rejection_reason ?? "—"}
                </p>
              )}
              {!showManualForm ? (
                <button
                  onClick={() => setShowManualForm(true)}
                  className="text-sm bg-amber-600 text-white px-3 py-1.5 rounded"
                >
                  Proposer un montant manuel
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    type="number"
                    min={0}
                    placeholder="Montant proposé (FCFA)"
                    className="border rounded px-2 py-1 text-sm w-full"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                  />
                  <textarea
                    placeholder="Justification (ex : acte X réalisé mais non présent dans la grille tarifaire)"
                    className="border rounded px-2 py-1 text-sm w-full"
                    rows={2}
                    value={manualJustification}
                    onChange={(e) => setManualJustification(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSubmitManualPricing}
                      disabled={submittingManual || !manualAmount}
                      className="text-sm bg-amber-600 text-white px-3 py-1.5 rounded disabled:opacity-50"
                    >
                      {submittingManual ? "Envoi..." : "Soumettre pour validation"}
                    </button>
                    <button
                      onClick={() => setShowManualForm(false)}
                      className="text-sm px-3 py-1.5 rounded border"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2 text-sm">
              <p>
                <strong>Montant proposé :</strong> {manualPricing.proposed_amount.toLocaleString("fr-FR")} FCFA
              </p>
              {manualPricing.justification && (
                <p className="text-gray-700">Justification : {manualPricing.justification}</p>
              )}
              <p className="text-xs text-gray-500">
                Proposé par {manualPricing.proposed_by_email ?? "?"}
                {manualPricing.proposed_at ? ` le ${new Date(manualPricing.proposed_at).toLocaleDateString("fr-FR")}` : ""}
              </p>

              {manualPricing.status === "pending" && (
                <>
                  <span className="inline-block text-xs px-2 py-1 rounded bg-yellow-100 text-yellow-800 font-medium">
                    En attente de validation admin
                  </span>

                  {myRole === "admin" && (
                    <div className="pt-2 space-y-2">
                      <div className="flex gap-2">
                        <button
                          onClick={handleApproveManualPricing}
                          disabled={reviewingManual}
                          className="text-sm bg-green-600 text-white px-3 py-1.5 rounded disabled:opacity-50"
                        >
                          Approuver
                        </button>
                        <button
                          onClick={() => setShowRejectForm((v) => !v)}
                          className="text-sm bg-red-600 text-white px-3 py-1.5 rounded"
                        >
                          Rejeter
                        </button>
                      </div>
                      {showRejectForm && (
                        <div className="space-y-2">
                          <textarea
                            placeholder="Motif du rejet"
                            className="border rounded px-2 py-1 text-sm w-full"
                            rows={2}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                          />
                          <button
                            onClick={handleRejectManualPricing}
                            disabled={reviewingManual || !rejectReason.trim()}
                            className="text-sm bg-red-600 text-white px-3 py-1.5 rounded disabled:opacity-50"
                          >
                            Confirmer le rejet
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {manualPricing.status === "approved" && (
                <span className="inline-block text-xs px-2 py-1 rounded bg-green-100 text-green-800 font-medium">
                  Approuvé par {manualPricing.approved_by_email ?? "?"}
                  {manualPricing.approved_at ? ` le ${new Date(manualPricing.approved_at).toLocaleDateString("fr-FR")}` : ""}
                </span>
              )}
            </div>
          )}
        </div>

        <p>
          <strong>Établissement :</strong> {clinicName}
        </p>
        <p>
          <strong>Médecin :</strong> {doctorLabel}
        </p>
        <p>
          <strong>Patient :</strong> {patientName}
        </p>
        <p>
          <strong>Assureur :</strong> {insurerName}
        </p>
        <p>
          <strong>N° adhérent :</strong> {memberNo}
        </p>
        <p>
          <strong>Code plan :</strong> {planCode}
        </p>
        <p>
          <strong>Affection(s) :</strong> {diagnosisLabel}
        </p>
        <p>
          <strong>Date de décision :</strong> {decisionDate}
          {consultation.insurer_decision_by_email ? ` (par ${consultation.insurer_decision_by_email})` : ""}
        </p>
        <p>
          <strong>Commentaire saisi :</strong>{" "}
          {consultation.insurer_comment?.trim()
            ? consultation.insurer_comment
            : "— aucun commentaire —"}
        </p>

        <div className="flex items-center gap-3 pt-2">
          {consultation.pdf_url ? (
            <a
              href={consultation.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              📄 Télécharger le rapport PDF de la prestation
            </a>
          ) : (
            <p className="text-gray-500 italic">
          Aucun PDF disponible pour cette consultation.
            </p>
          )}

          <button
            onClick={handleRegeneratePdfWithPricing}
            disabled={regenerating || pricingComputing}
            className="text-sm bg-gray-900 text-white px-3 py-2 rounded disabled:opacity-60"
          >
            {(regenerating || pricingComputing) ? "Traitement..." : "🔄 Recalculer + Régénérer PDF"}
          </button>
        </div>
      </div>

      {/* ✅ Messagerie assureur ↔ médecin */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">
          Messagerie avec le médecin
        </h2>

        {doctorStaffId && insurerAgentId ? (
          <ConsultationChat
            consultationId={consultation.id}
            doctorStaffId={doctorStaffId}
            insurerAgentId={insurerAgentId}
          />
        ) : (
          <p className="text-sm text-gray-500">
            Messagerie indisponible pour cette consultation (médecin ou agent
            assureur introuvable).
          </p>
        )}
      </div>
    </div>
  );
}
