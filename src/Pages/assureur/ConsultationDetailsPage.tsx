// src/Pages/assureur/ConsultationDetailsPage.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useUser } from "@clerk/clerk-react";
import ConsultationChat from "../../components/ui/assureur/ConsultationChat";
import { generateConsultationPdf } from "../../lib/generateConsultationPdf";

interface ConsultationRow {
  id: string;
  created_at: string;
  amount: number | null;
  status: string;
  pdf_url: string | null;
  patient_id: string | null;
  insurer_comment: string | null;
  insurer_decision_at: string | null;
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

  doctor:
    | { id: string; name: string | null }
    | { id: string; name: string | null }[]
    | null;

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

export default function AssureurConsultationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useUser();

  const [consultation, setConsultation] = useState<ConsultationRow | null>(null);
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [membership, setMembership] = useState<MembershipRow | null>(null);
  const [insurerAgentId, setInsurerAgentId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const [tariffContext, setTariffContext] = useState<"private_weekday" | "private_weekend">("private_weekday");
  const [coverageCase, setCoverageCase] = useState<"acute" | "chronic">("acute");

  const [pricingComputing, setPricingComputing] = useState(false);

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
        diagnosis_code_text,
        diagnosis_code:diagnosis_codes ( code, title ),
        clinic:clinics ( name ),
        doctor:clinic_staff ( id, name )
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
        .select("id")
        .eq("clerk_user_id", user.id)
        .maybeSingle();

      if (staffError) {
        console.error("[AssureurDetails] erreur insurer_staff:", staffError);
      } else if (staffRow?.id) {
        setInsurerAgentId(staffRow.id);
      }
    }

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
      const res = await fetch(
        "https://zwxegqevthzfphdqtjew.supabase.co/functions/v1/generate-consultation-pdf",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

  if (loading) return <p className="p-6">Chargement...</p>;
  if (!consultation) return <p className="p-6">Consultation introuvable</p>;

  // Helpers pour les noms (objet OU tableau)
  const clinicName = consultation.clinic
    ? Array.isArray(consultation.clinic)
      ? consultation.clinic[0]?.name ?? "—"
      : consultation.clinic.name ?? "—"
    : "—";

  const doctorName = consultation.doctor
    ? Array.isArray(consultation.doctor)
      ? consultation.doctor[0]?.name ?? "—"
      : consultation.doctor.name ?? "—"
    : "—";

  const doctorStaffId = consultation.doctor
    ? Array.isArray(consultation.doctor)
      ? consultation.doctor[0]?.id ?? null
      : consultation.doctor.id ?? null
    : null;

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

        <p>
          <strong>Établissement :</strong> {clinicName}
        </p>
        <p>
          <strong>Médecin :</strong> {doctorName}
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
