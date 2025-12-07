import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useUser } from '@clerk/clerk-react';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'react-toastify';
import suggestions_base from '../../../lib/suggestions_base.json';
import medicationSuggestions from '../../../lib/medication_suggestions.json';
import { fetchGptSuggestions } from '../../../lib/openai';
import { useSearchParams } from "react-router-dom";
import { useDoctorContext } from "../../../hooks/useDoctorContext";
import { buildZKDeeplink } from "../../../lib/deeplink";

export default function NewConsultationPage() {
  const { user } = useUser();

  // ✅ types explicites (corrige erreurs 4 et 5)
  const [step, setStep] = useState<"biometry" | "consultation" | "done">("biometry");
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);

  const [acts, setActs] = useState<string[]>([]);
  const [currentAct, setCurrentAct] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  const [medications, setMedications] = useState<string[]>([]);
  const [currentMedication, setCurrentMedication] = useState<string>("");

  const [fingerprintMissing, setFingerprintMissing] = useState<boolean>(false);

  const [provisional, setProvisional] = useState<boolean>(false);
  const [isCheckingRights, setIsCheckingRights] = useState<boolean>(false);

  const [symptomsType, setSymptomsType] = useState<"text" | "drawn">("text");
  const [diagnosisType, setDiagnosisType] = useState<"text" | "drawn">("text");
  const [symptoms, setSymptoms] = useState<string>("");
  const [diagnosis, setDiagnosis] = useState<string>("");

  // ✅ types explicites sur refs
  const symptomsCanvasRef = useRef<SignatureCanvas | null>(null);
  const diagnosisCanvasRef = useRef<SignatureCanvas | null>(null);

  const doctorInfo = useDoctorContext();

  function getOriginForPhone(): string {
    const host = window.location.hostname;
    const isLocal =
      host === "localhost" ||
      /^127\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^10\./.test(host);

    if (isLocal) return import.meta.env.VITE_LAN_ORIGIN?.trim() || window.location.origin;
    return window.location.origin;
  }

  type DoctorCtx = { clinicId: string; doctorId: string };

  async function resolveDoctorContext(): Promise<DoctorCtx | null> {
    if (doctorInfo?.clinic_id && doctorInfo?.doctor_id) {
      return {
        clinicId: String(doctorInfo.clinic_id),
        doctorId: String(doctorInfo.doctor_id),
      };
    }

    const clerkId = user?.id || null;
    const email = user?.primaryEmailAddress?.emailAddress || null;

    let q = supabase
      .from("clinic_staff")
      .select("id, clinic_id, role, email, clerk_user_id")
      .eq("role", "doctor")
      .limit(1);

    if (clerkId) q = q.eq("clerk_user_id", clerkId);
    else if (email) q = q.eq("email", email);

    const { data, error } = await q.maybeSingle();
    if (!data || error) {
      toast.error("Impossible d'identifier votre clinique.");
      return null;
    }
    return { clinicId: String(data.clinic_id), doctorId: String(data.id) };
  }

  // ✅ ctx typé (corrige erreur 2)
  const ensureDraftConsultation = useCallback(
    async (ctx: DoctorCtx | null): Promise<string | null> => {
      if (consultationId) return consultationId;
      if (!ctx) return null;

      const { data, error } = await supabase
        .from("consultations")
        .insert([
          {
            doctor_id: ctx.doctorId,
            clinic_id: ctx.clinicId,
            status: "draft",
            is_urgent: false,
          },
        ])
        .select("id")
        .single();

      if (error || !data) {
        console.error("[consultation draft] insert failed:", error);
        toast.error("Erreur création brouillon.");
        return null;
      }

      setConsultationId(data.id);
      return data.id;
    },
    [consultationId]
  );

  // 🔹 Déclencheur biométrie
  const handleBiometrySuccess = async () => {
    try {
      let ctx =
        doctorInfo?.clinic_id && doctorInfo?.doctor_id
          ? { clinicId: String(doctorInfo.clinic_id), doctorId: String(doctorInfo.doctor_id) }
          : await resolveDoctorContext();

      if (!ctx) return;

      let cid = consultationId;
      if (!cid) cid = await ensureDraftConsultation(ctx);
      if (!cid) return; // sécurité

      const returnPath = `/multispecialist/doctor/new-consultation?consultation_id=${encodeURIComponent(cid)}`;
      sessionStorage.setItem("fp:return", returnPath);

      // ✅ consultationId optional string => on passe jamais null (corrige erreur 1)
      const { deeplink, intentUri } = buildZKDeeplink({
        mode: "identify",
        clinicId: ctx.clinicId,
        operatorId: ctx.doctorId,
        consultationId: cid || undefined,
        redirectOriginForPhone: getOriginForPhone(),
        redirectPath: "/fp-callback?scope=doctor_multi",
      });

      window.location.href = deeplink;
      setTimeout(() => {
        window.location.href = intentUri;
      }, 800);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lancement biométrie");
    }
  };

  const handleBiometryFailure = async () => {
    const ctx = await resolveDoctorContext();
    await ensureDraftConsultation(ctx);
    setFingerprintMissing(true);
    setStep("consultation");
  };

  // 🔹 Callback biométrie + nettoyage
const [searchParams] = useSearchParams();

  useEffect(() => {
    (async () => {
      const urlCid     = searchParams.get("consultation_id");
      const urlIdFound = searchParams.get("id_found");
      const urlIdNot   = searchParams.get("id_not_found");

      // 🔹 Lecture de fp:last (set par FingerprintCallback)
      let last: any = null;
      try {
        const raw = sessionStorage.getItem("fp:last");
        if (raw) last = JSON.parse(raw);
      } catch {}

      const lastIsIdentify =
        last &&
        last.type === "identify" &&
        last.ok === true &&
        !!last.patient_id;

      // 🔹 Choix final des IDs (URL prioritaire, sinon backup fp:last)
      const finalPatientId =
        urlIdFound || (lastIsIdentify ? last.patient_id : null);

      const finalConsultationId =
        urlCid || (lastIsIdentify ? last.consultation_id || null : null);

      if (finalConsultationId) {
        setConsultationId(finalConsultationId);
      }

      if (finalPatientId) {
        // ✅ Patient reconnu → on passe en étape consultation
        setPatientId(finalPatientId);
        setFingerprintMissing(false);
        setStep("consultation");

        if (finalConsultationId) {
          try {
            await supabase
              .from("consultations")
              .update({
                patient_id: finalPatientId,
                biometric_verified_at: new Date().toISOString(),
                status: "draft", // on reste en brouillon tant que non envoyé à l'assureur
              })
              .eq("id", finalConsultationId);
          } catch (e) {
            console.error("[NewConsultation] update après identify:", e);
          }
        }
      } else if (urlIdNot === "1") {
        // ❌ Empreinte non trouvée
        setFingerprintMissing(true);
        setStep("consultation");
        toast.warn("Aucun patient correspondant.");
      }

      // 🔹 Nettoyage de l’URL (on garde au pire consultation_id)
      if (urlCid) {
        window.history.replaceState(
          null,
          "",
          window.location.pathname +
            `?consultation_id=${encodeURIComponent(urlCid)}`
        );
      } else {
        window.history.replaceState(null, "", window.location.pathname);
      }

      // 🔹 Si on a consommé fp:last pour un identify, on peut le nettoyer
      if (lastIsIdentify) {
        try {
          sessionStorage.removeItem("fp:last");
        } catch {}
      }
    })();
  }, [searchParams]);

  // ---------- Enregistrement consultation ----------
// ---------- Enregistrement consultation ----------
const createConsultation = async () => {
  try {
    // 1) Contexte médecin
    const ctx =
      doctorInfo?.clinic_id && doctorInfo?.doctor_id
        ? { clinicId: String(doctorInfo.clinic_id), doctorId: String(doctorInfo.doctor_id) }
        : await resolveDoctorContext();

    if (!ctx) {
      toast.error("Impossible d'identifier votre clinique (doctor).");
      return;
    }

    // 2) Validations minimum
    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Montant invalide.");
      return;
    }

    const symptomsDrawn =
      symptomsType === "drawn"
        ? symptomsCanvasRef.current?.getTrimmedCanvas().toDataURL()
        : null;

    const diagnosisDrawn =
      diagnosisType === "drawn"
        ? diagnosisCanvasRef.current?.getTrimmedCanvas().toDataURL()
        : null;

    const hasSymptoms =
      (symptomsType === "text" && symptoms.trim().length > 0) || !!symptomsDrawn;
    const hasDiagnosis =
      (diagnosisType === "text" && diagnosis.trim().length > 0) || !!diagnosisDrawn;

    if (!hasSymptoms) {
      toast.error("Renseignez les symptômes.");
      return;
    }
    if (!hasDiagnosis) {
      toast.error("Renseignez le diagnostic.");
      return;
    }

    // 3) Récupérer l'assureur du patient (s'il existe)
    let insurerId: string | null = null;
    if (patientId) {
      const { data: membership, error: memErr } = await supabase
        .from("insurer_memberships")
        .select("insurer_id")
        .eq("patient_id", patientId)
        .order("last_verified_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (memErr) {
        console.warn("[createConsultation] insurer_memberships error:", memErr);
      } else if (membership?.insurer_id) {
        insurerId = membership.insurer_id as string;
      }
    }

    // 4) Statut : 'sent' uniquement si patient assuré + assureur trouvé
    const targetStatus =
      patientId && insurerId ? "sent" : "draft";

    // 5) Payload commun INSERT / UPDATE
    const payload: any = {
      doctor_id: ctx.doctorId,
      clinic_id: ctx.clinicId,
      patient_id: patientId,                 // peut être null si pas d'empreinte / pas identifié
      symptoms: symptomsType === "text" ? symptoms.trim() : null,
      symptoms_drawn: symptomsDrawn,
      diagnosis: diagnosisType === "text" ? diagnosis.trim() : null,
      diagnosis_drawn: diagnosisDrawn,
      amount: parsedAmount,
      acts: acts.map((a) => ({ type: a })), // colonne 'acts' (jsonb)
      medications: medications,             // colonne 'medications' (jsonb / text[])
      fingerprint_missing: fingerprintMissing,
      insurer_id: insurerId,                // 👉 nouveau
      status: targetStatus,                 // 👉 'sent' ou 'draft'
    };

    console.log("[createConsultation] payload=", payload);

    let error = null;
    let newId: string | null = null;

    // 6) Si pas encore de consultationId => INSERT
    if (!consultationId) {
      const { data, error: insertError } = await supabase
        .from("consultations")
        .insert([payload])
        .select("id")
        .single();

      error = insertError;
      if (!insertError && data?.id) {
        newId = data.id as string;
        setConsultationId(newId);
      }
    } else {
      // 7) Sinon UPDATE sur la ligne existante
      const { error: updateError } = await supabase
        .from("consultations")
        .update(payload)
        .eq("id", consultationId);

      error = updateError;
    }

    if (error) {
      console.error("[createConsultation] error:", error);
      toast.error("Erreur lors de l'enregistrement de la consultation.");
      return;
    }

    toast.success(
      targetStatus === "sent"
        ? "Consultation envoyée à l’assureur."
        : "Consultation enregistrée en brouillon."
    );
    setStep("done");

    // 8) Reset minimum pour la prochaine consultation
    setActs([]);
    setCurrentAct("");
    setMedications([]);
    setCurrentMedication("");
    setSymptoms("");
    setDiagnosis("");
    setAmount("");
    setPatientId(null);
    setFingerprintMissing(false);
  } catch (e) {
    console.error("[createConsultation] unexpected error:", e);
    toast.error("Erreur inattendue lors de l'enregistrement.");
  }
};

  // ------------- Vérification droits assureur -------------
  const checkRights = async () => {
    if (!patientId) return toast.error("Aucun patient");
    if (!consultationId) return toast.error("Consultation brouillon manquante");

    try {
      setIsCheckingRights(true);

      const resp = await fetch("/.netlify/functions/insurer-rights-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: patientId,
          consultation_id: consultationId,
          clinic_id: doctorInfo?.clinic_id,
        }),
      });

      if (!resp.ok) throw new Error();

      const data = await resp.json();

      await supabase
        .from("consultations")
        .update({
          status: "sent",
          insurer_amount: data.insurer_amount ?? null,
          patient_amount: data.patient_amount ?? null,
          insurer_id: data.insurer_id ?? null,
          rights_checked_at: new Date().toISOString(),
        })
        .eq("id", consultationId);

      setAmount(String((data.insurer_amount || 0) + (data.patient_amount || 0)));
      setProvisional(false);
      toast.success("Droits confirmés");
    } catch (e) {
      toast.error("Échec de la vérification des droits");
    } finally {
      setIsCheckingRights(false);
    }
  };

  // ---------------- Rendu UI ----------------
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Démarrer une consultation</h1>

      {step === "biometry" && (
        <div className="space-y-4">
          <Button onClick={handleBiometrySuccess}>Empreinte capturée</Button>
          <Button onClick={handleBiometryFailure} className="bg-orange-600">
            Continuer sans empreinte
          </Button>
        </div>
      )}

      {step === "consultation" && (
        <div className="space-y-4">

          {patientId && (
            <div>
              <Button
                onClick={() => {
                  const url = `/multispecialist/doctor/patients/${encodeURIComponent(patientId)}`;
                  window.open(url, "_blank", "noreferrer");
                }}
              >
                Voir dossier patient
              </Button>
            </div>
          )}

          <div>
            <label>Symptômes :</label>
            <div className="flex gap-2 my-1">
              <Button onClick={() => setSymptomsType("text")}>Clavier</Button>
              <Button onClick={() => setSymptomsType("drawn")}>Écriture</Button>
            </div>

            {symptomsType === "text" ? (
              <Textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
            ) : (
              <SignatureCanvas ref={symptomsCanvasRef} canvasProps={{ className: "border h-40 w-full" }} />
            )}
          </div>

          <div>
            <label>Diagnostic :</label>
            <div className="flex gap-2 my-1">
              <Button onClick={() => setDiagnosisType("text")}>Clavier</Button>
              <Button onClick={() => setDiagnosisType("drawn")}>Écriture</Button>
            </div>

            {diagnosisType === "text" ? (
              <Textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
            ) : (
              <SignatureCanvas ref={diagnosisCanvasRef} canvasProps={{ className: "border h-40 w-full" }} />
            )}
          </div>

          <div>
            <label>Actes médicaux :</label>
            <div className="flex gap-2">
              <Input
                value={currentAct}
                onChange={(e) => setCurrentAct(e.target.value)}
                placeholder="Acte médical"
              />
              <Button
                onClick={() => {
                  if (currentAct.trim()) {
                    setActs((prev) => [...prev, currentAct.trim()]);
                    setCurrentAct("");
                  }
                }}
              >
                Ajouter acte
              </Button>
            </div>
            <ul className="list-disc pl-5">
              {acts.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>

          <div>
            <label>Médicaments :</label>
            <div className="flex gap-2">
              <Input
                value={currentMedication}
                onChange={(e) => setCurrentMedication(e.target.value)}
                placeholder="Médicament"
              />
              <Button
                onClick={() => {
                  if (currentMedication.trim()) {
                    setMedications((prev) => [...prev, currentMedication.trim()]);
                    setCurrentMedication("");
                  }
                }}
              >
                Ajouter médicament
              </Button>
            </div>
            <ul className="list-disc pl-5">
              {medications.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>

          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Montant total FCFA"
          />

          {provisional && (
            <Button onClick={checkRights} disabled={isCheckingRights}>
              {isCheckingRights ? "Vérification..." : "Vérifier droits assureur"}
            </Button>
          )}

          <Button onClick={createConsultation} className="bg-blue-600 w-full">
            Enregistrer la consultation
          </Button>
        </div>
      )}

      {step === "done" && (
        <div className="text-center space-y-4">
          <p>Consultation enregistrée</p>
          <Button onClick={() => setStep("biometry")}>Nouvelle consultation</Button>
        </div>
      )}
    </div>
  );
}