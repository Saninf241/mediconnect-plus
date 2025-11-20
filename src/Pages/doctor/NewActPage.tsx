// src/Pages/doctor/NewActPage.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useSearchParams } from "react-router-dom";
import SignatureCanvas from "react-signature-canvas";
import { toast } from "react-toastify";

import { supabase } from "../../lib/supabase";
import { buildZKDeeplink } from "../../lib/deeplink";
import { useDoctorContext } from "../../hooks/useDoctorContext";
import { fetchGptSuggestions } from "../../lib/openai";

import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";

import suggestions_base from "../../lib/suggestions_base.json";
import medicationSuggestions from "../../lib/medication_suggestions.json";

type Step = "biometry" | "consultation" | "done";

export default function NewActPage() {
  const { user } = useUser();
  const doctorInfo = useDoctorContext();

  const [step, setStep] = useState<Step>("biometry");
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);

  const [acts, setActs] = useState<string[]>([]);
  const [currentAct, setCurrentAct] = useState("");
  const [amount, setAmount] = useState("");

  const [fingerprintMissing, setFingerprintMissing] = useState(false);

  const [symptomsType, setSymptomsType] = useState<"text" | "drawn">("text");
  const [diagnosisType, setDiagnosisType] = useState<"text" | "drawn">("text");

  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [medications, setMedications] = useState<string[]>([]);
  const [currentMedication, setCurrentMedication] = useState("");
  const [gptSuggestions, setGptSuggestions] = useState<string[]>([]);

  const symptomsCanvasRef = useRef<SignatureCanvas>(null);
  const diagnosisCanvasRef = useRef<SignatureCanvas>(null);

  // -------- Helpers --------
  function getOriginForPhone() {
    const host = window.location.hostname;
    const isLocal =
      host === "localhost" ||
      /^127\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^10\./.test(host);
    if (isLocal) return import.meta.env.VITE_LAN_ORIGIN?.trim() || window.location.origin;
    return "https://mediconnect-plus.com"; // domaine public
  }

const ensureDraftConsultation = useCallback(async () => {
  if (consultationId) return consultationId;

  if (!doctorInfo?.clinic_id || !doctorInfo?.doctor_id) {
    toast.error("Contexte médecin/clinique manquant");
    return null;
  }

  const { data, error } = await supabase
    .from("consultations")
    .insert([
      {
        doctor_id: doctorInfo.doctor_id,
        clinic_id: doctorInfo.clinic_id,
        status: "draft",
      },
    ])
    .select("id")
    .single();

  if (error || !data) {
    console.error(error);
    toast.error("Impossible de créer la consultation brouillon");
    return null;
  }
  setConsultationId(data.id);
  return data.id as string;
}, [consultationId, doctorInfo?.clinic_id, doctorInfo?.doctor_id]);

  // -------- Déclenchement biométrie (deeplink identify) --------
    const handleBiometrySuccess = async () => {
    const id = await ensureDraftConsultation();
    if (!id) return;

    if (!doctorInfo?.clinic_id || !doctorInfo?.doctor_id) {
      toast.error("Contexte médecin incomplet (clinic_id / doctor_id).");
      return;
    }
    
    const returnPath = `/doctor/new-act?consultation_id=${encodeURIComponent(id)}`;
    sessionStorage.setItem("fp:return", returnPath);

    const { deeplink, intentUri } = buildZKDeeplink({
      mode: "identify",
      clinicId: String(doctorInfo.clinic_id),
      operatorId: String(doctorInfo.doctor_id),
      consultationId: id,                  // ← on le passe aussi ici
      redirectOriginForPhone: getOriginForPhone(),
      redirectPath: "/fp-callback?scope=doctor_specalist",
    });

    try {
      window.location.href = deeplink;
      setTimeout(() => { window.location.href = intentUri; }, 900);
    } catch {
      window.location.href = intentUri;
    }
  };

  const handleBiometryFailure = async () => {
    const id = await ensureDraftConsultation();
    if (!id) return;
    setPatientId(null);
    setFingerprintMissing(true);
    setStep("consultation");
  };

  // -------- Retour du scanner (query) --------
  const [searchParams] = useSearchParams();
  useEffect(() => {
    (async () => {
      const cid = searchParams.get("consultation_id");
      if (cid) setConsultationId(cid);

      const mode = searchParams.get("mode");
      const found = searchParams.get("found");
      const userId = searchParams.get("user_id");
      const error = searchParams.get("error");

      if (mode === "identify") {
        if (found === "true" && userId) {
          setPatientId(userId);
          setFingerprintMissing(false);
          setStep("consultation");
          toast.success("Patient reconnu ✅");

          if (cid) {
            try {
              await supabase
                .from("consultations")
                .update({
                  status: "pending_rights",
                  patient_id: userId,
                  biometric_verified_at: new Date().toISOString(), // trace l’identité
                })
                .eq("id", cid);
            } catch (e) {
              console.error("Erreur update pending_rights:", e);
            }
          }
        } else {
          setPatientId(null);
          setFingerprintMissing(true);
          setStep("consultation");
          toast.warn("Empreinte inconnue, poursuivre sans empreinte.");
          if (error) console.warn("identify error:", error);
        }
      }

      // ✅ nettoie l'URL (empêche un retraitement au refresh)
      const clean = window.location.pathname + (cid ? `?consultation_id=${encodeURIComponent(cid)}` : "");
      window.history.replaceState(null, "", clean);

      // compat ancienne URL ?notfound=true
      const notFound = searchParams.get("notfound");
      if (notFound === "true") {
        toast.warn("Empreinte inconnue, veuillez créer un nouveau patient");
        setFingerprintMissing(true);
        setStep("consultation");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------- Suggestions GPT (inchangé) --------
  useEffect(() => {
    const loadGptSuggestions = async () => {
      if (diagnosis.trim().length < 3) return;
      const prompt = `Liste les médicaments ou actes médicaux fréquemment utilisés pour le diagnostic suivant : "${diagnosis.trim()}". Réponds uniquement par une liste.`;
      const suggestions = await fetchGptSuggestions(prompt);
      setGptSuggestions(suggestions);
    };
    loadGptSuggestions();
  }, [diagnosis]);

  // -------- Ajouts listes --------
  const addAct = () => {
    if (currentAct.trim()) {
      setActs((prev) => [...prev, currentAct.trim()]);
      setCurrentAct("");
    }
  };
  const addMedication = () => {
    if (currentMedication.trim()) {
      setMedications((prev) => [...prev, currentMedication.trim()]);
      setCurrentMedication("");
    }
  };

  // -------- Enregistrer la consultation (UPDATE le brouillon) --------
  const createConsultation = async () => {
    if (!user?.id) return toast.error("Utilisateur médecin introuvable");
    if (!consultationId) return toast.error("Consultation brouillon manquante");

    const parsedAmount = parseInt(amount);
    if (acts.length === 0) return toast.error("Ajoutez au moins un acte.");
    if (isNaN(parsedAmount) || parsedAmount <= 0) return toast.error("Montant invalide.");

    const symptomsDrawn =
      symptomsType === "drawn" ? symptomsCanvasRef.current?.getTrimmedCanvas().toDataURL() : null;
    const diagnosisDrawn =
      diagnosisType === "drawn" ? diagnosisCanvasRef.current?.getTrimmedCanvas().toDataURL() : null;

    const hasSymptoms = (symptomsType === "text" && symptoms.trim()) || symptomsDrawn;
    const hasDiagnosis = (diagnosisType === "text" && diagnosis.trim()) || diagnosisDrawn;

    if (!hasSymptoms) return toast.error("Renseignez les symptômes");
    if (!hasDiagnosis) return toast.error("Renseignez le diagnostic");
    if (!patientId && !fingerprintMissing) return toast.error("Aucun patient sélectionné");

    const targetStatus = "validated"; // ou 'pending_rights' si tu veux forcer validation plus tard

    const { error } = await supabase
      .from("consultations")
      .update({
        patient_id: patientId,
        symptoms: symptomsType === "text" ? symptoms.trim() : null,
        symptoms_drawn: symptomsDrawn,
        diagnosis: diagnosisType === "text" ? diagnosis.trim() : null,
        diagnosis_drawn: diagnosisDrawn,
        actes: acts.map((type) => ({ type })),
        medications,
        amount: parsedAmount,
        status: targetStatus,
        fingerprint_missing: fingerprintMissing,
      })
      .eq("id", consultationId);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      toast.success("Consultation enregistrée");
      // reset UI
      setActs([]);
      setCurrentAct("");
      setMedications([]);
      setCurrentMedication("");
      setSymptoms("");
      setDiagnosis("");
      setAmount("");
      setPatientId(null);
      setStep("done");
    }
  };

  // -------- Suggestions locales médocs --------
  const diagnosisKeywords = diagnosis.trim().toLowerCase().split(/\s+/);
  const filteredMeds = Object.entries(medicationSuggestions)
    .filter(([key]) => diagnosisKeywords.some((keyword) => key.includes(keyword)))
    .flatMap(([, suggestions]) => suggestions);

  // -------- UI --------
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Démarrer une consultation</h1>

      {step === "biometry" && (
        <div className="space-y-4">
          <p>Veuillez scanner l’empreinte du patient :</p>
          <div className="flex gap-4">
            <Button onClick={handleBiometrySuccess}>Empreinte capturée</Button>
            <Button onClick={handleBiometryFailure} className="bg-orange-600">
              Continuer sans empreinte
            </Button>
          </div>
        </div>
      )}

      {step === "consultation" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Patient : {patientId ? "✅ patient identifié" : "❌ patient non identifié (sans empreinte)"}
          </p>

          <div>
            <label className="font-semibold">Symptômes :</label>
            <div className="flex gap-2 my-1">
              <Button onClick={() => setSymptomsType("text")}>Clavier</Button>
              <Button onClick={() => setSymptomsType("drawn")}>Écriture</Button>
            </div>
            {symptomsType === "text" ? (
              <Textarea
                placeholder="Symptômes"
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
              />
            ) : (
              <SignatureCanvas
                ref={symptomsCanvasRef}
                penColor="black"
                canvasProps={{ className: "border w-full h-40 rounded" }}
              />
            )}
          </div>

          <div>
            <label className="font-semibold">Diagnostic :</label>
            <div className="flex gap-2 my-1">
              <Button onClick={() => setDiagnosisType("text")}>Clavier</Button>
              <Button onClick={() => setDiagnosisType("drawn")}>Écriture</Button>
            </div>
            {diagnosisType === "text" ? (
              <Textarea
                placeholder="Diagnostic"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            ) : (
              <SignatureCanvas
                ref={diagnosisCanvasRef}
                penColor="black"
                canvasProps={{ className: "border w-full h-40 rounded" }}
              />
            )}
          </div>

          {gptSuggestions.length > 0 && (
            <div className="text-sm text-gray-600">
              <p className="font-semibold">Suggestions GPT :</p>
              <ul className="list-disc pl-5">
                {gptSuggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="font-semibold">Actes médicaux :</label>
            <div className="flex gap-2">
              <Input
                placeholder="Acte médical"
                value={currentAct}
                onChange={(e) => setCurrentAct(e.target.value)}
                list="act-suggestions"
              />
              <Button onClick={addAct}>Ajouter acte</Button>
            </div>
            <datalist id="act-suggestions">
              {Object.values(suggestions_base)
                .flatMap((v) => (Array.isArray(v) ? v : Object.values(v).flat()))
                .map((a, i) => (typeof a === "string" ? <option key={i} value={a} /> : null))}
            </datalist>
            <ul className="list-disc pl-5">
              {acts.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>

          <div>
            <label className="font-semibold">Médicaments :</label>
            <div className="flex gap-2">
              <Input
                placeholder="Médicament"
                value={currentMedication}
                onChange={(e) => setCurrentMedication(e.target.value)}
                list="med-suggestions"
              />
              <Button onClick={addMedication}>Ajouter médicament</Button>
            </div>
            <datalist id="med-suggestions">
              {filteredMeds.map((s, i) => (
                <option key={i} value={s.toString()} />
              ))}
            </datalist>
            <ul className="list-disc pl-5">
              {medications.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>

          <Input
            type="number"
            placeholder="Montant total (FCFA)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Button onClick={createConsultation} className="w-full bg-blue-600">
            Enregistrer la consultation
          </Button>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-4 text-center">
          <p className="text-green-700 text-lg">✅ Consultation enregistrée.</p>
          <Button onClick={() => setStep("biometry")}>Démarrer une nouvelle</Button>
        </div>
      )}
    </div>
  );
}
