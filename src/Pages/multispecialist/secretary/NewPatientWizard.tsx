// src/pages/multispecialist/secretary/NewPatientWizard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { supabase } from "../../../lib/supabase";
import { startDeeplinkSession, checkEligibility, createPatientDraft, finalizeUninsured } from "../../../lib/api/secretary";
import { v4 as uuidv4 } from "uuid";

type PatientType = "insured_card" | "insured_no_card" | "uninsured";

type PatientForm = {
  full_name: string;
  dob: string; // YYYY-MM-DD
  sex?: "M" | "F" | "O";
  national_id?: string;
  email?: string;
  phone: string;

  insurer_id?: string;
  insurer_name?: string;
  member_no?: string;
  plan_code?: string;
  coverage_start?: string;
  coverage_end?: string;

  consents: {
    data: boolean;
    share_insurer: boolean;
    biometric: boolean;
  };
  biometrics?: {
    status: "pending" | "captured" | "failed" | "skipped";
    quality?: number;
    template_hash?: string;
  };

  verification_level?: "N1" | "N2" | "N3";
};

const defaultForm: PatientForm = {
  full_name: "",
  dob: "",
  sex: "O",
  national_id: "",
  email: "",
  phone: "",
  insurer_id: undefined,
  insurer_name: "",
  member_no: "",
  plan_code: "",
  coverage_start: "",
  coverage_end: "",
  consents: { data: false, share_insurer: false, biometric: false },
  biometrics: { status: "pending" },
  verification_level: undefined,
};

const card = "rounded-2xl border bg-white p-5 shadow-sm";
const button = "px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50";
const ghostBtn = "px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50";
const label = "text-sm font-medium text-gray-700";
const input = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/40";

export default function NewPatientWizard() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const [step, setStep] = useState<number>(1);
  const [ptype, setPtype] = useState<PatientType | null>(null);
  const [form, setForm] = useState<PatientForm>({ ...defaultForm });
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  // Helper pour avoir un token costaud
  async function getSupabaseToken(): Promise<string> {
    if (!isLoaded) throw new Error("Session en cours de chargement.");
    if (!isSignedIn) throw new Error("Veuillez vous reconnecter.");
    // Essaye d’abord le template "supabase", sinon token par défaut
    const t1 = await getToken({ template: "supabase" }).catch(() => null);
    const t2 = t1 || (await getToken().catch(() => null));
    if (!t2) throw new Error("Auth requise (Clerk).");
    return t2;
  }

  async function resolveSecretaryContext() {
    try {
      const raw = localStorage.getItem("establishmentUserSession");
      if (raw) {
        const s = JSON.parse(raw);
        if (s?.clinicId || s?.clinic_id) {
          return {
            clinicId: s.clinicId || s.clinic_id,
            staffId: s.id || s.user_id || null,
            email: s.email || null,
          };
        }
      }
    } catch {}

    const { data: staff, error } = await supabase
      .from("clinic_staff")
      .select("id, clinic_id, role, email")
      .eq("role", "secretary")
      .limit(1)
      .maybeSingle();

    if (error || !staff?.clinic_id) {
      throw new Error(
        "Impossible d'identifier votre clinique. Ouvrez d'abord 'Mes Patients' (qui initialise la session) ou rattachez ce compte à une clinique dans 'clinic_staff'."
      );
    }

    const sessionObj = {
      id: staff.id,
      role: "secretary",
      email: staff.email,
      clinicId: staff.clinic_id,
    };
    localStorage.setItem("establishmentUserSession", JSON.stringify(sessionObj));

    return { clinicId: staff.clinic_id, staffId: staff.id, email: staff.email };
  }

  // (Optionnel) charger liste des assureurs pour un select
  const [insurers, setInsurers] = useState<{ id: string; name: string; level?: "N1"|"N2"|"N3" }[]>([]);
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("insurers")
        .select("id,name,verification_level");
      if (!error && data) {
        setInsurers(
          data.map((x: any) => ({
            id: x.id,
            name: x.name,
            level: (x.verification_level as "N1"|"N2"|"N3") ?? "N3",
          }))
        );
      } else {
        setInsurers([
          { id: "ascoma", name: "Ascoma", level: "N1" },
          { id: "olea", name: "Olea", level: "N1" },
          { id: "cnamgs", name: "CNAMGS", level: "N2" },
          { id: "autre", name: "Autre", level: "N3" },
        ]);
      }
    })();
  }, []);

  function next() { setStep((s) => Math.min(s + 1, 4)); }
  function back() { setStep((s) => Math.max(s - 1, 1)); }
  function update<K extends keyof PatientForm>(k: K, v: PatientForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function resolveVerificationLevel(): "N1"|"N2"|"N3"|undefined {
    if (!form.insurer_id && !form.insurer_name) return undefined;
    const found = insurers.find(
      i => i.id === form.insurer_id || i.name === form.insurer_name
    );
    return found?.level ?? "N3";
  }

  // Étape 3 : capture biométrie
  async function handleCaptureFingerprint() {
    setLoading(true); setMessage("");
    try {
      const ctx = await resolveSecretaryContext();

      const patientId = await ensureDraftPatient();

      const res = await startDeeplinkSession({
        clinic_id: ctx.clinicId,
        secretary_id: ctx.staffId || "",
        patient_temp_id: patientId,
        callback_url: `${window.location.origin}/api/device/callback`,
        action: "fingerprint"
      });

      if (!res?.deeplink_url) throw new Error("Impossible d'initier la session appareil.");
      window.location.href = res.deeplink_url;
      setMessage("Capture lancée sur la tablette. Revenez ici après la lecture de l'empreinte.");
    } catch (e: any) {
      setMessage(e.message || "Échec du lancement de la capture biométrique.");
    } finally {
      setLoading(false);
    }
  }

  // ✅ PROD CLEAN: création du brouillon via Edge Function (pas d'INSERT direct côté front)
async function ensureDraftPatient(): Promise<string> {
  // validations mini
  if (!form.full_name || !form.dob || !form.phone) {
    throw new Error("Nom, date de naissance et téléphone sont requis.");
  }

  // Contexte secrétaire (clinic + staff)
  const ctx = await resolveSecretaryContext();

  // Dédup NIN si fourni (évite d’insérer en double)
  if (form.national_id) {
    const { data: dup } = await supabase
      .from("patients")
      .select("id")
      .eq("national_id", form.national_id)
      .limit(1)
      .maybeSingle();
    if (dup?.id) return dup.id;
  }

  // 👉 RPC SECURITY DEFINER : pas de RLS, pas de token à gérer
  const token = await getSupabaseToken();
  const minimalPatient = {
    full_name: form.full_name,
    dob: form.dob,
    sex: form.sex ?? "O",
    national_id: form.national_id || null,
    email: form.email || null,
    phone: form.phone,
    is_assured: !!form.insurer_id || !!form.insurer_name,
  };
  const { patient_id } = await createPatientDraft(
    minimalPatient,
    token,
    {
      clinic_id: ctx.clinicId,
      full_name: form.full_name,
      dob: form.dob,                       // mappé côté RPC vers date_of_birth
      sex: form.sex ?? "O",
      national_id: form.national_id || null,
      email: form.email || null,
      phone: form.phone,
      created_by: ctx.staffId! || null,
    }
  );

  return patient_id;
}

  // Étape 4 : eligibility & enregistrement final
  async function handleEligibilityAndSave() {
  setLoading(true); 
  setMessage("");
  try {
    const ctx = await resolveSecretaryContext();       // utile pour la suite
    const patientId = await ensureDraftPatient();      // crée/récupère le draft

    // ✅ CAS NON ASSURÉ → finalisation via RPC
    if (ptype === "uninsured") {
      const token = await getSupabaseToken();
      const fingerprintMissing = !(form.biometrics?.status === "captured");
      await finalizeUninsured(
        patientId,
        fingerprintMissing,
        token,
        {
          patient_id: patientId,
          fingerprint_captured: form.biometrics?.status === "captured",
        }
      );
      setMessage("Patient non assuré enregistré ✅");
      return;  // on s'arrête là
    }

    // 🔶 CAS ASSURÉ (on garde ta logique existante)
    if (ptype === "insured_card" || ptype === "insured_no_card") {
      const level = resolveVerificationLevel() ?? "N3";

      await supabase.from("patients")
        .update({ status: "verifying" })
        .eq("id", patientId);

      const resp = await checkEligibility({
        insurer_id: form.insurer_id || undefined,
        insurer_name: form.insurer_name || undefined,
        patient: { full_name: form.full_name, dob: form.dob, national_id: form.national_id },
        membership: { member_no: form.member_no, plan_code: form.plan_code },
        facility_id: ctx.clinicId,
        idempotency_key: uuidv4(),
      });

      if (resp?.status === "not_eligible") {
        await supabase.from("patients").update({ status: "rejected" }).eq("id", patientId);
        setMessage("Assuré non éligible aujourd’hui (droits expirés ou introuvables).");
        return;
      }

      if (resp?.status === "eligible") {
        await supabase.from("patients").update({ status: "verified" }).eq("id", patientId);
      } else if (resp?.status === "pending") {
        // rester 'verifying'
      } else {
        await supabase.from("patients").update({ status: "rejected" }).eq("id", patientId);
        setMessage("Assuré non éligible (vérifie N° adhérent / droits).");
        return;
      }

      // upsert membership (identique à ton code)
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const insurerIdOrNull = UUID_RE.test(form.insurer_id || "") ? form.insurer_id : null;

      const { error: memErr } = await supabase.from("insurer_memberships").insert({
        patient_id: patientId,
        insurer_id: insurerIdOrNull,
        member_no: form.member_no || "",
        plan_code: resp?.plan_code || form.plan_code || null,
        coverage_start: form.coverage_start || null,
        coverage_end: form.coverage_end || resp?.coverage?.expires || null,
        last_verified_at: new Date().toISOString(),
        verification_level: level,
        confidence: resp?.confidence || "medium",
        source: resp || {},
      });
      if (memErr) throw memErr;
    }

    // Finalisation commune (si assuré on ne touche pas à status ici)
    const isAssured = (ptype === "insured_card" || ptype === "insured_no_card");
    const fingerprintMissing = !(form.biometrics?.status === "captured");
    const { error: updErr } = await supabase
      .from("patients")
      .update({
        status: isAssured ? undefined : "verified",
        is_assured: isAssured,
        fingerprint_missing: fingerprintMissing,
        fingerprint_enrolled: !fingerprintMissing,
      })
      .eq("id", patientId);
    if (updErr) throw updErr;

    setMessage("Patient enregistré avec succès ✅");
  } catch (e: any) {
    setMessage(e.message || "Échec de l’enregistrement.");
  } finally {
    setLoading(false);
  }
}

// UI
return (
  <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ajouter un patient</h1>
        <div className="text-sm text-gray-500">Étape {step} / 4</div>
      </header>

      {/* Étape 1 – Choix du type */}
      {step === 1 && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className={`${card} text-left hover:shadow-md`} onClick={() => { setPtype("insured_card"); setStep(2); }}>
            <h3 className="font-semibold mb-1">Assuré avec carte</h3>
            <p className="text-sm text-gray-600">Lecture carte + empreinte + vérification droits.</p>
          </button>
          <button className={`${card} text-left hover:shadow-md`} onClick={() => { setPtype("insured_no_card"); setStep(2); }}>
            <h3 className="font-semibold mb-1">Assuré sans carte</h3>
            <p className="text-sm text-gray-600">Saisie manuelle contrat + empreinte + éligibilité.</p>
          </button>
          <button className={`${card} text-left hover:shadow-md`} onClick={() => { setPtype("uninsured"); setStep(2); }}>
            <h3 className="font-semibold mb-1">Non assuré</h3>
            <p className="text-sm text-gray-600">Identité + (option) empreinte, pas d’éligibilité.</p>
          </button>
        </section>
      )}

      {/* Étape 2 – Formulaire */}
      {step === 2 && (
        <section className={`${card} space-y-4`}>
          <h3 className="font-semibold">Informations patient</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Nom complet *</label>
              <input className={input} value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
            </div>
            <div>
              <label className={label}>Date de naissance (YYYY-MM-DD) *</label>
              <input className={input} value={form.dob} onChange={(e) => update("dob", e.target.value)} placeholder="1990-01-31" />
            </div>
            <div>
              <label className={label}>Téléphone *</label>
              <input className={input} value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div>
              <label className={label}>N° d’identification (NIN)</label>
              <input className={input} value={form.national_id} onChange={(e) => update("national_id", e.target.value)} />
            </div>
            <div>
              <label className={label}>Email</label>
              <input className={input} value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
          </div>

          {(ptype === "insured_card" || ptype === "insured_no_card") && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Assureur</label>
                  <select
                    className={input}
                    value={form.insurer_id || ""}
                    onChange={(e) => {
                      const id = e.target.value;
                      const found = insurers.find(i => i.id === id);
                      setForm((f) => ({ ...f, insurer_id: id, insurer_name: found?.name || id, verification_level: found?.level }));
                    }}
                  >
                    <option value="">— choisir —</option>
                    {insurers.map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                  {form.verification_level && (
                    <p className="text-xs text-gray-500 mt-1">Niveau détecté : <b>{form.verification_level}</b></p>
                  )}
                </div>
                <div>
                  <label className={label}>N° d’adhérent</label>
                  <input className={input} value={form.member_no} onChange={(e) => update("member_no", e.target.value)} />
                </div>
                <div>
                  <label className={label}>Code plan</label>
                  <input className={input} value={form.plan_code} onChange={(e) => update("plan_code", e.target.value)} />
                </div>
              </div>

              {ptype === "insured_card" && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className={ghostBtn}
                    onClick={async () => {
                      setLoading(true); setMessage("");
                      try {
                        const email = user?.primaryEmailAddress?.emailAddress || undefined;
                        const ctx = await resolveSecretaryContext();
                        const patientId = await ensureDraftPatient();
                        const res = await startDeeplinkSession({
                          clinic_id: ctx.clinicId,
                          secretary_id: ctx.staffId || "",
                          patient_temp_id: patientId,
                          callback_url: `${window.location.origin}/api/device/callback`,
                          action: "read_card"
                        });
                        if (!res?.deeplink_url) throw new Error("Impossible d'initier la lecture carte.");
                        window.location.href = res.deeplink_url;
                        setMessage("Lecture carte lancée. Les champs seront pré-remplis après retour.");
                      } catch (e: any) {
                        setMessage(e.message || "Échec lecture carte.");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? "Lecture..." : "Lire la carte"}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Consentements */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.consents.data}
                onChange={(e) => setForm((f) => ({ ...f, consents: { ...f.consents, data: e.target.checked } }))}
              />
              <span>Consentement traitement des données</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.consents.share_insurer}
                onChange={(e) => setForm((f) => ({ ...f, consents: { ...f.consents, share_insurer: e.target.checked } }))}
              />
              <span>Partage avec l’assureur</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.consents.biometric}
                onChange={(e) => setForm((f) => ({ ...f, consents: { ...f.consents, biometric: e.target.checked } }))}
              />
              <span>Capture biométrique</span>
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button className={ghostBtn} onClick={back}>Retour</button>
            <button className={button} onClick={next}>Continuer</button>
          </div>
        </section>
      )}

      {/* Étape 3 – Biométrie */}
      {step === 3 && (
        <section className={`${card} space-y-4`}>
          <h3 className="font-semibold">Biométrie</h3>
          <p className="text-sm text-gray-600">
            Lance la capture d’empreinte sur la tablette. Si le matériel est indisponible,
            tu peux ignorer (le dossier sera marqué “empreinte manquante”).
          </p>
          <div className="flex items-center gap-3">
            <button className={button} onClick={handleCaptureFingerprint} disabled={loading}>
              {loading ? "Initialisation..." : "Scanner l’empreinte"}
            </button>
            <button
              className={ghostBtn}
              onClick={() =>
                setForm((f) => ({ ...f, biometrics: { status: "skipped" } }))
              }
            >
              Ignorer (temporaire)
            </button>
          </div>

          <div className="flex items-center justify-between">
            <button className={ghostBtn} onClick={back}>Retour</button>
            <button className={button} onClick={() => setStep(4)}>Continuer</button>
          </div>
        </section>
      )}

      {/* Étape 4 – Éligibilité + Enregistrement */}
      {step === 4 && (
        <section className={`${card} space-y-4`}>
          <h3 className="font-semibold">Vérification & Enregistrement</h3>
          <p className="text-sm text-gray-600">
            {ptype === "uninsured"
              ? "Patient non assuré : pas d’appel éligibilité. Enregistrement direct."
              : "Appel éligibilité/pré‑vérification selon le niveau de l’assureur."}
          </p>

          <div className="flex items-center justify-between">
            <button className={ghostBtn} onClick={back}>Retour</button>
            <button className={button} onClick={handleEligibilityAndSave} disabled={loading}>
              {loading ? "Traitement..." : "Enregistrer le patient"}
            </button>
          </div>
        </section>
      )}

      {!!message && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          {message}
        </div>
      )}
    </div>
  );
}