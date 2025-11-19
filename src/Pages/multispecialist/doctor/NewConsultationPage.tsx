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
  const [step, setStep] = useState<'biometry' | 'consultation' | 'done'>('biometry');
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [acts, setActs] = useState<string[]>([]);
  const [currentAct, setCurrentAct] = useState('');
  const [amount, setAmount] = useState('');
  const [fingerprintMissing, setFingerprintMissing] = useState(false);
  const [provisional, setProvisional] = useState<boolean>(false);
  const [provisionalAmount, setProvisionalAmount] = useState<string>('');
  const [isCheckingRights, setIsCheckingRights] = useState(false);

  const [symptomsType, setSymptomsType] = useState<'text' | 'drawn'>('text');
  const [diagnosisType, setDiagnosisType] = useState<'text' | 'drawn'>('text');

  const [symptoms, setSymptoms] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medications, setMedications] = useState<string[]>([]);
  const [currentMedication, setCurrentMedication] = useState('');
  const [gptSuggestions, setGptSuggestions] = useState<string[]>([]);

  const symptomsCanvasRef = useRef<SignatureCanvas>(null);
  const diagnosisCanvasRef = useRef<SignatureCanvas>(null);

  const doctorId = user?.id;
  const doctorInfo = useDoctorContext();


  //Origine pour redirect_url (comme secrétaire)
    function getOriginForPhone(): string {
      const host = window.location.hostname;
      const isLocal =
        host === "localhost" ||
        /^127\./.test(host) ||
        /^192\.168\./.test(host) ||
        /^10\./.test(host);
  
      if (isLocal) {
        return (import.meta.env.VITE_LAN_ORIGIN?.trim() || window.location.origin);
      }
      return window.location.origin;
    }

  //Resolution contexte médecin
  async function resolveDoctorContext() {
    if (doctorInfo?.clinic_id && doctorInfo?.doctor_id) {
      return { clinicId: String(doctorInfo.clinic_id), doctorId: String(doctorInfo.doctor_id) };
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
    if (error || !data?.clinic_id) {
      toast.error("Impossible d'identifier votre clinique (rôle doctor).");
      return null;
    }
    return { clinicId: String(data.clinic_id), doctorId: String(data.id) };
  }

  //Brouillon consultation (idempotent)
  const ensureDraftConsultation = useCallback(
    async (ctx: { clinicId: string; doctorId: string } | null) => {
      if (consultationId) return consultationId;
      if (!ctx) return null;

      const { data, error } = await supabase
        .from("consultations")
        .insert([
          {
            doctor_id: ctx.doctorId,
            clinic_id: ctx.clinicId,
            status: "draft",
          },
        ])
        .select("id")
        .single();

      if (error || !data) {
        console.error("[consultation draft] insert failed:", error);
        return null;
      }
      setConsultationId(data.id);
      return data.id as string;
    },
    [consultationId]
  );


  // -------- Déclenchement biométrie (deeplink identify) --------
  const handleBiometrySuccess = async () => {
    try { //1) Résoudre le contexte médecin (hook OU fallback DB)
      let ctx = doctorInfo?.clinic_id && doctorInfo?.doctor_id
      ? { clinicId: String(doctorInfo.clinic_id), doctorId: String(doctorInfo.doctor_id) }
      : null;

    if (!ctx) {
      ctx = await resolveDoctorContext();
    }
    if (!ctx) return;

    //2) Brouillon (non bloquant)
    let id = consultationId;
    if (!id) {
      id = await ensureDraftConsultation(ctx);
    }

    //3) Mémoriser où revenir (si on a un id)
    const returnPath = id
      ? `/multispecialist/doctor/new-consultation?consultation_id=${encodeURIComponent(id)}`
      : `/multispecialist/doctor/new-consultation`;
    sessionStorage.setItem("fp:return", returnPath);

    //4) Construire le deeplink (on passe consultationId seulement si l'on a)
    const base = {
      mode: "identify" as const,
      clinicId: ctx.clinicId,
      operatorId: ctx.doctorId,
      redirectOriginForPhone: getOriginForPhone(),
      redirectPath: "/fp-callback?scope=doctor_multi",
    };

    const { deeplink, intentUri } = id
      ? buildZKDeeplink({ ...base, consultationId: id })
      : buildZKDeeplink(base as any);
    console.log("[doctor identify] deeplink", deeplink, intentUri);

    //5) Bouton HTML simple : même logique que le secrétariat
    window.location.href = deeplink; 
    setTimeout(() => { window.location.href = intentUri; }, 900);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors du lancement de la biométrie.");
    }
  };
    

  useEffect(() => {
    const loadGptSuggestions = async () => {
      if (diagnosis.trim().length < 3) return;
      const prompt = `Liste les médicaments ou actes médicaux fréquemment utilisés pour le diagnostic suivant : "${diagnosis.trim()}". Réponds uniquement par une liste.`;
      const suggestions = await fetchGptSuggestions(prompt);
      setGptSuggestions(suggestions);
    };
    loadGptSuggestions();
  }, [diagnosis]);

  const addAct = () => {
    if (currentAct.trim()) {
      setActs([...acts, currentAct.trim()]);
      setCurrentAct('');
    }
  };

  const addMedication = () => {
    if (currentMedication.trim()) {
      setMedications([...medications, currentMedication.trim()]);
      setCurrentMedication('');
    }
  };

  const [searchParams] = useSearchParams();

  useEffect(() => {
    async function run() {
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
                .update({ status: "pending_rights", patient_id: userId })
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

      const notFound = searchParams.get("notfound");
      if (notFound === "true") {
        toast.warn("Empreinte inconnue, veuillez créer un nouveau patient");
        setFingerprintMissing(true);
        setStep("consultation");
      }
    }

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBiometryFailure = async () => {
    const ctx = await resolveDoctorContext();
    const id = await ensureDraftConsultation(ctx);
    if (!id) return;
    setFingerprintMissing(true);
    setStep('consultation');
  };

  const createConsultation = async () => {
    if (!doctorId) return toast.error("Utilisateur médecin introuvable");
    if (!consultationId) return toast.error("Consultation brouillon manquante");

    const parsedAmount = parseInt(amount);
    if (acts.length === 0) return toast.error("Ajoutez au moins un acte.");
    if (isNaN(parsedAmount) || parsedAmount <= 0) return toast.error("Montant invalide.");

    const symptomsDrawn = symptomsType === 'drawn' ? symptomsCanvasRef.current?.getTrimmedCanvas().toDataURL() : null;
    const diagnosisDrawn = diagnosisType === 'drawn' ? diagnosisCanvasRef.current?.getTrimmedCanvas().toDataURL() : null;

    const hasSymptoms = (symptomsType === 'text' && symptoms.trim()) || symptomsDrawn;
    const hasDiagnosis = (diagnosisType === 'text' && diagnosis.trim()) || diagnosisDrawn;

    if (!hasSymptoms) return toast.error("Renseignez les symptômes");
    if (!hasDiagnosis) return toast.error("Renseignez le diagnostic");
    if (!patientId && !fingerprintMissing) return toast.error("Aucun patient sélectionné");

    const targetStatus = provisional ? 'pending_rights' : 'validated';

    const { error } = await supabase
      .from('consultations')
      .update({
        patient_id: patientId,
        symptoms: symptomsType === 'text' ? symptoms.trim() : null,
        symptoms_drawn: symptomsDrawn,
        diagnosis: diagnosisType === 'text' ? diagnosis.trim() : null,
        diagnosis_drawn: diagnosisDrawn,
        actes: acts.map(type => ({ type })),
        medications,
        amount: parsedAmount,
        status: targetStatus,
        fingerprint_missing: fingerprintMissing,
      })
      .eq('id', consultationId);

    if (error) toast.error('Erreur lors de la mise à jour');
    else {
      toast.success('Consultation enregistrée');
      setActs([]); setCurrentAct('');
      setMedications([]); setCurrentMedication('');
      setSymptoms(''); setDiagnosis('');
      setAmount('');
      setPatientId(null);
      setStep('done');
    }
  };

  const diagnosisKeywords = diagnosis.trim().toLowerCase().split(/\s+/);
  const filteredMeds = Object.entries(medicationSuggestions)
    .filter(([key]) => diagnosisKeywords.some(keyword => key.includes(keyword)))
    .flatMap(([, suggestions]) => suggestions);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Démarrer une consultation</h1>

      {step === 'biometry' && (
        <div className="space-y-4">
          <p>Veuillez scanner l’empreinte du patient :</p>
          <div className="flex gap-4 ">
                <Button type="button" onClick={handleBiometrySuccess}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  Empreinte capturée
                  </Button>

                <Button
                  onClick={handleBiometryFailure}
                  className="bg-orange-600">
                    Continuer sans empreinte
                    </Button>
                </div>
        </div>
      )}


      {step === 'consultation' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Patient : {patientId ? '✅ patient identifié' : '❌ patient non identifié (sans empreinte)'}
          </p>

          {provisional && (
            <div className="p-3 rounded bg-yellow-50 border border-yellow-300 text-yellow-800">
              <div className="font-semibold">Tarif provisoire — droits à vérifier</div>
              <p className="text-sm">
                Les droits assureur ne sont pas encore confirmés. Le montant saisi ci-dessous est provisoire.
                Vous pouvez vérifier les droits maintenant.
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  disabled={isCheckingRights || !patientId}
                  onClick={async () => {
                    try {
                      setIsCheckingRights(true);
                      const resp = await fetch("/.netlify/functions/insurer-rights-sync", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          patient_id: patientId,
                          clinic_id: doctorInfo?.clinic_id,
                          consultation_id: consultationId,
                        }),
                      });

                      if (!resp.ok) throw new Error("sync_failed");
                      const data = await resp.json();
                      setProvisional(false);
                      setAmount(String((data.insurer_amount || 0) + (data.patient_amount || 0)));

                      await supabase.from('consultations').update({
                        status: 'draft',
                        insurer_amount: data.insurer_amount ?? null,
                        patient_amount: data.patient_amount ?? null,
                        insurer_id: data.insurer_id ?? null,
                        rights_checked_at: new Date().toISOString(),
                      }).eq('id', consultationId!);

                      toast.success("Droits confirmés. Montant mis à jour.");
                    } catch (e) {
                      toast.error("Échec de la vérification des droits.");
                    } finally {
                      setIsCheckingRights(false);
                    }
                  }}
                  className="bg-amber-600"
                >
                  {isCheckingRights ? "Vérification..." : "Vérifier les droits"}
                </Button>

                {!!patientId && (
                  <Button
                    onClick={() => {
                      const url = `/multispecialist/doctor/patients?focus=${encodeURIComponent(patientId)}&return=${encodeURIComponent(`/multispecialist/doctor/new-consultation?consultation_id=${consultationId}`)}`;
                      window.open(url, "_blank", "noreferrer");
                    }}
                    className="border border-gray-300"
                  >
                    Voir dossier patient
                  </Button>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="font-semibold">Symptômes :</label>
            <div className="flex gap-2 my-1">
              <Button onClick={() => setSymptomsType('text')}>Clavier</Button>
              <Button onClick={() => setSymptomsType('drawn')}>Écriture</Button>
            </div>
            {symptomsType === 'text' ? (
              <Textarea placeholder="Symptômes" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
            ) : (
              <SignatureCanvas ref={symptomsCanvasRef} penColor="black" canvasProps={{ className: "border w-full h-40 rounded" }} />
            )}
          </div>

          <div>
            <label className="font-semibold">Diagnostic :</label>
            <div className="flex gap-2 my-1">
              <Button onClick={() => setDiagnosisType('text')}>Clavier</Button>
              <Button onClick={() => setDiagnosisType('drawn')}>Écriture</Button>
            </div>
            {diagnosisType === 'text' ? (
              <Textarea placeholder="Diagnostic" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
            ) : (
              <SignatureCanvas ref={diagnosisCanvasRef} penColor="black" canvasProps={{ className: "border w-full h-40 rounded" }} />
            )}
          </div>

          {gptSuggestions.length > 0 && (
            <div className="text-sm text-gray-600">
              <p className="font-semibold">Suggestions GPT :</p>
              <ul className="list-disc pl-5">{gptSuggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}

          <div>
            <label className="font-semibold">Actes médicaux :</label>
            <div className="flex gap-2">
              <Input placeholder="Acte médical" value={currentAct} onChange={(e) => setCurrentAct(e.target.value)} list="act-suggestions" />
              <Button onClick={addAct}>Ajouter acte</Button>
            </div>
            <datalist id="act-suggestions">
              {Object.values(suggestions_base)
                .flatMap((v) => Array.isArray(v) ? v : Object.values(v).flat())
                .map((a, i) => typeof a === 'string' ? <option key={i} value={a} /> : null)}
            </datalist>
            <ul className="list-disc pl-5">{acts.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </div>

          <div>
            <label className="font-semibold">Médicaments :</label>
            <div className="flex gap-2">
              <Input placeholder="Médicament" value={currentMedication} onChange={(e) => setCurrentMedication(e.target.value)} list="med-suggestions" />
              <Button onClick={addMedication}>Ajouter médicament</Button>
            </div>
            <datalist id="med-suggestions">
              {filteredMeds.map((s, i) => <option key={i} value={s.toString()} />) }
            </datalist>
            <ul className="list-disc pl-5">{medications.map((m, i) => <li key={i}>{m}</li>)}</ul>
          </div>

          <Input type="number" placeholder="Montant total (FCFA)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button onClick={createConsultation} className="w-full bg-blue-600">Enregistrer la consultation</Button>
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-4 text-center">
          <p className="text-green-700 text-lg">✅ Consultation enregistrée.</p>
          <Button onClick={() => setStep('biometry')}>Démarrer une nouvelle</Button>
        </div>
      )}
    </div>
  );
}
