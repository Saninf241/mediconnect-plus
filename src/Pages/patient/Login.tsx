// src/Pages/patient/Login.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabasePatient, getSupabaseFunctionsUrl } from "../../lib/supabasePatient";

type Step = "phone" | "otp" | "activation";

function normalizeGabonPhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (raw.trim().startsWith("+")) return `+${digits}`;
  const local = digits.replace(/^0/, "");
  return `+241${local}`;
}

export default function PatientLoginPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const e164Phone = normalizeGabonPhone(phone);

  async function handleSendOtp() {
    setLoading(true);
    setError(null);
    const { error: otpError } = await supabasePatient.auth.signInWithOtp({
      phone: e164Phone,
    });
    setLoading(false);
    if (otpError) {
      setError("Impossible d'envoyer le code. Vérifiez le numéro puis réessayez.");
      return;
    }
    setStep("otp");
  }

  async function checkDossierLinked(accessToken: string): Promise<boolean> {
    const res = await fetch(getSupabaseFunctionsUrl("patient-portal-data"), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok;
  }

  async function handleVerifyOtp() {
    setLoading(true);
    setError(null);
    const { data, error: verifyError } = await supabasePatient.auth.verifyOtp({
      phone: e164Phone,
      token: otp,
      type: "sms",
    });
    if (verifyError || !data.session) {
      setLoading(false);
      setError("Code incorrect ou expiré.");
      return;
    }

    const alreadyLinked = await checkDossierLinked(data.session.access_token);
    setLoading(false);
    if (alreadyLinked) {
      navigate("/patient", { replace: true });
    } else {
      setStep("activation");
    }
  }

  async function handleActivate() {
    setLoading(true);
    setError(null);
    const { data: sessionData } = await supabasePatient.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setLoading(false);
      setError("Session expirée, recommencez.");
      setStep("phone");
      return;
    }

    const res = await fetch(getSupabaseFunctionsUrl("patient-activate-account"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Code d'activation invalide.");
      return;
    }
    navigate("/patient", { replace: true });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-50 p-4">
      <div className="bg-white shadow rounded-2xl p-8 w-full max-w-md space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Mon espace santé</h1>
          <p className="text-sm text-gray-500 mt-1">
            {step === "phone" &&
              "Entrez le numéro de téléphone renseigné à la clinique."}
            {step === "otp" &&
              `Un code vous a été envoyé par SMS au ${e164Phone}.`}
            {step === "activation" &&
              "Première connexion : entrez le code remis par la clinique pour relier votre dossier."}
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
            {error}
          </div>
        )}

        {step === "phone" && (
          <div className="space-y-3">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex : 077074475"
              className="border rounded-lg p-3 w-full"
            />
            <button
              disabled={loading || phone.trim().length < 6}
              onClick={handleSendOtp}
              className="w-full bg-emerald-600 text-white rounded-lg py-3 font-medium disabled:opacity-50"
            >
              {loading ? "Envoi…" : "Recevoir le code par SMS"}
            </button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Code reçu par SMS"
              className="border rounded-lg p-3 w-full tracking-widest text-center"
            />
            <button
              disabled={loading || otp.trim().length < 4}
              onClick={handleVerifyOtp}
              className="w-full bg-emerald-600 text-white rounded-lg py-3 font-medium disabled:opacity-50"
            >
              {loading ? "Vérification…" : "Valider"}
            </button>
            <button
              onClick={() => setStep("phone")}
              className="w-full text-sm text-gray-500 underline"
            >
              Changer de numéro
            </button>
          </div>
        )}

        {step === "activation" && (
          <div className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code remis par la clinique"
              className="border rounded-lg p-3 w-full tracking-widest text-center"
            />
            <button
              disabled={loading || code.trim().length < 4}
              onClick={handleActivate}
              className="w-full bg-emerald-600 text-white rounded-lg py-3 font-medium disabled:opacity-50"
            >
              {loading ? "Activation…" : "Activer mon espace"}
            </button>
            <p className="text-xs text-gray-400">
              Pas de code ? Demandez-le à l'accueil lors de votre prochaine visite.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
