// src/pages/multispecialist/secretary/NewPatientWizard.tsx
import React, { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { supabase } from "../../../lib/supabase";
import { checkEligibility, createPatientDraft, finalizeUninsured } from "../../../lib/api/secretary";
import { v4 as uuidv4 } from "uuid";
import { buildZKDeeplink } from "../../../lib/deeplink";

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("fp") === "captured") {
    setForm((f) => ({ ...f, biometrics: { status: "captured" } }));
    postMessage("Empreinte enregistrée avec succès ✅");
  }
}, []);

type PatientType = "insured_card" | "insured_no_card" | "uninsured";

type PatientForm = {
  full_name: string;
  dob: string;
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

  consents: { data: boolean; share_insurer: boolean; biometric: boolean };
  biometrics?: { status: "pending" | "captured" | "failed" | "skipped"; quality?: number; template_hash?: string };

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
};

const card = "rounded-2xl border bg-white p-5 shadow-sm";
const button = "px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50";
const ghostBtn = "px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50";
const label = "text-sm font-medium text-gray-700";
const input = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/40";

// Helpers
const getOriginForPhone = () => {
  const host = window.location.hostname;
  const isLocal =
    host === "localhost" || /^127\./.test(host) || /^192\.168\./.test(host) || /^10\./.test(host);
  if (isLocal) {
    return import.meta.env.VITE_LAN_ORIGIN?.trim() || window.location.origin;
  }
  return window.location.origin;
};

export default function NewPatientWizard() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const [step, setStep] = useState<number>(1);
  const [ptype, setPtype] = useState<PatientType | null>(null);
  const [form, setForm] = useState<PatientForm>({ ...defaultForm });
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  // nécessaires pour l’étape 3
  const [ctx, setCtx] = useState<{ clinicId: string; staffId: string } | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);

  // ✅ Au retour de /fp-callback, marquer “capturé” + réutiliser le patient_id
  useEffect(() => {
    const raw = sessionStorage.getItem("fp:last");
    if (!raw) return;
    try {
      const info = JSON.parse(raw);
      if (info?.type === "enroll") {
        if (info.ok) {
          setForm((f) => ({ ...f, biometrics: { status: "captured" } }));
          if (info.patient_id) setPatientId(info.patient_id);
        } else {
          setForm((f) => ({ ...f, biometrics: { status: "failed" } }));
        }
      }
    } catch {}
    sessionStorage.removeItem("fp:last");
  }, []);

  // token Clerk (template supabase si possible)
  async function getSupabaseToken(): Promise<string> {
    if (!isLoaded) throw new Error("Session en cours de chargement.");
    if (!isSignedIn) throw new Error("Veuillez vous reconnecter.");
    const t1 = await getToken({ template: "supabase" }).catch(() => null);
    const t2 = t1 || (await getToken().catch(() => null));
    if (!t2) throw new Error("Auth requise (Clerk).");
    return t2;
  }

  // contexte secrétaire
  async function resolveSecretaryContext() {
    if (!isLoaded) throw new Error("Session en cours de chargement.");
    if (!isSignedIn) throw new Error("Veuillez vous reconnecter.");

    const clerkId = user?.id || null;
    const email = user?.primaryEmailAddress?.emailAddress || null;

    let q = supabase
      .from("clinic_staff")
      .select("id, clinic_id, role, email, clerk_user_id")
      .eq("role", "secretary")
      .limit(1);

    if (clerkId) q = q.eq("clerk_user_id", clerkId);
    else if (email) q = q.eq("email", email);

    const { data, error } = await q.maybeSingle();
    if (error || !data?.clinic_id) {
      if (email) {
        const { data: d2 } = await supabase
          .from("clinic_staff")
          .select("id, clinic_id, role, email")
          .eq("email", email)
          .eq("role", "secretary")
          .limit(1)
          .maybeSingle();
        if (d2?.clinic_id) return { clinicId: d2.clinic_id as string, staffId: d2.id as string };
      }
      throw new Error("Impossible d'identifier votre clinique (clinic_staff.clerk_user_id ou email).");
    }
    return { clinicId: data.clinic_id as string, staffId: data.id as string };
  }

  // assureurs (optionnel)
  const [insurers, setInsurers] = useState<{ id: string; name: string; level?: "N1" | "N2" | "N3" }[]>([]);
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("insurers").select("id,name,verification_level");
      if (!error && data) {
        setInsurers(data.map((x: any) => ({ id: x.id, name: x.name, level: (x.verification_level as "N1" | "N2" | "N3") ?? "N3" })));
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
  function update<K extends keyof PatientForm>(k: K, v: PatientForm[K]) { setForm((f) => ({ ...f, [k]: v })); }

  function resolveVerificationLevel(): "N1" | "N2" | "N3" | undefined {
    if (!form.insurer_id && !form.insurer_name) return undefined;
    const found = insurers.find((i) => i.id === form.insurer_id || i.name === form.insurer_name);
    return found?.level ?? "N3";
  }

  // ✅ Création brouillon idempotente (réutilise si déjà créé, cache session + dédup NIN)
  async function ensureDraftPatient(): Promise<string> {
    // réutiliser si déjà présent
    if (patientId) return patientId;

    if (!form.full_name || !form.dob || !form.phone)
      throw new Error("Nom, date de naissance et téléphone sont requis.");

    const ctxNow = await resolveSecretaryContext();
    setCtx(ctxNow);

    // clé de cache par session
    const sessionKey = `wizardDraft:${ctxNow.clinicId}:${form.full_name}:${form.dob}:${form.phone}`;
    const cached = sessionStorage.getItem(sessionKey);
    if (cached) { setPatientId(cached); return cached; }

    // dédup NIN
    if (form.national_id) {
      const { data: dup } = await supabase
        .from("patients")
        .select("id")
        .eq("national_id", form.national_id)
        .limit(1)
        .maybeSingle();
      if (dup?.id) {
        setPatientId(dup.id);
        sessionStorage.setItem(sessionKey, dup.id);
        return dup.id;
      }
    }

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

    const { patient_id } = await createPatientDraft(minimalPatient, token, {
      clinic_id: ctxNow.clinicId,
      full_name: form.full_name,
      dob: form.dob,
      sex: form.sex ?? "O",
      national_id: form.national_id || null,
      email: form.email || null,
      phone: form.phone,
      created_by: ctxNow.staffId ?? undefined,
    });

    setPatientId(patient_id);
    sessionStorage.setItem(sessionKey, patient_id);
    return patient_id;
  }

  // Préparer ctx + patientId quand on arrive à l’étape 3
  useEffect(() => {
    if (step !== 3) return;
    (async () => {
      try {
        const pid = await ensureDraftPatient();
        const c = await resolveSecretaryContext();
        setPatientId(pid);
        setCtx(c);
      } catch (e) {
        setMessage((e as Error).message);
      }
    })();
  }, [step]); // OK

  // Étape 4 : eligibility & finalisation
  async function handleEligibilityAndSave() {
    setLoading(true);
    setMessage("");
    try {
      const ctxNow = ctx ?? (await resolveSecretaryContext());
      const pid = patientId ?? (await ensureDraftPatient());

      if (ptype === "uninsured") {
        const token = await getSupabaseToken();
        const fingerprintMissing = !(form.biometrics?.status === "captured");
        await finalizeUninsured(pid, fingerprintMissing, token, {
          patient_id: pid,
          fingerprint_captured: form.biometrics?.status === "captured",
        });
        setMessage("Patient non assuré enregistré ✅");
        return;
      }

      if (ptype === "insured_card" || ptype === "insured_no_card") {
        const level = resolveVerificationLevel() ?? "N3";

        await supabase.from("patients").update({ status: "verifying" }).eq("id", pid);

        const resp = await checkEligibility({
          insurer_id: form.insurer_id || undefined,
          insurer_name: form.insurer_name || undefined,
          patient: { full_name: form.full_name, dob: form.dob, national_id: form.national_id },
          membership: { member_no: form.member_no, plan_code: form.plan_code },
          facility_id: ctxNow.clinicId,
          idempotency_key: uuidv4(),
        });

        if (resp?.status === "not_eligible") {
          await supabase.from("patients").update({ status: "rejected" }).eq("id", pid);
          setMessage("Assuré non éligible aujourd’hui.");
          return;
        }
        if (resp?.status === "eligible") {
          await supabase.from("patients").update({ status: "verified" }).eq("id", pid);
        } // sinon pending → rester verifying

        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const insurerIdOrNull = UUID_RE.test(form.insurer_id || "") ? form.insurer_id : null;

        const { error: memErr } = await supabase.from("insurer_memberships").insert({
          patient_id: pid,
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

      const isAssured = ptype === "insured_card" || ptype === "insured_no_card";
      const fingerprintMissing = !(form.biometrics?.status === "captured");
      const { error: updErr } = await supabase
        .from("patients")
        .update({
          status: isAssured ? undefined : "verified",
          is_assured: isAssured,
          fingerprint_missing: fingerprintMissing,
          fingerprint_enrolled: !fingerprintMissing,
        })
        .eq("id", pid);
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
                      const found = insurers.find((i) => i.id === id);
                      setForm((f) => ({ ...f, insurer_id: id, insurer_name: found?.name || id, verification_level: found?.level }));
                    }}
                  >
                    <option value="">— choisir —</option>
                    {insurers.map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}
                  </select>
                  {form.verification_level && (
                    <p className="text-xs text-gray-500 mt-1">Niveau détecté : <b>{form.verification_level}</b></p>
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

              {/* Placeholder “Lire la carte” */}
              {ptype === "insured_card" && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className={ghostBtn}
                    onClick={async () => {
                      setLoading(true); setMessage("");
                      try {
                        await ensureDraftPatient(); // pour avoir patientId prêt
                        setMessage("Lecture carte : bientôt disponible (deeplink 'read_card' à brancher).");
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
            <button
              className={button}
              onClick={async () => {
                try {
                  setLoading(true); setMessage("");
                  const pid = await ensureDraftPatient();
                  const c = ctx ?? (await resolveSecretaryContext());

                  const { deeplink, intentUri } = buildZKDeeplink({
                    mode: "enroll",
                    clinicId: c.clinicId,
                    operatorId: c.staffId,
                    patientId: pid,
                    redirectOriginForPhone: getOriginForPhone(),
                    redirectPath: "/fp-callback",
                  });

                  // une seule redirection
                  window.location.href = deeplink || intentUri;

                  setMessage("Capture lancée sur la tablette. Revenez ici après la lecture de l’empreinte.");
                } catch (e: any) {
                  setMessage(e.message || "Échec du lancement de la capture biométrique.");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
            >
              {loading ? "Initialisation..." : "Scanner l’empreinte"}
            </button>

            {form.biometrics?.status === "captured" && (
              <p className="text-sm text-green-700">Empreinte capturée ✅ — passe à l’étape suivante.</p>
            )}

            <button
              className={ghostBtn}
              onClick={() => setForm((f) => ({ ...f, biometrics: { status: "skipped" } }))}
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
              : "Appel éligibilité/pré-vérification selon le niveau de l’assureur."}
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
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">{message}</div>
      )}
    </div>
  );
}
function setForm(arg0: (f: any) => any) {
  throw new Error("Function not implemented.");
}

