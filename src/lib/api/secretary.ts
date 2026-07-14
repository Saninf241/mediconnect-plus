// src/components/lib/api/secretary.ts
import { supabase } from "../supabase";

export async function startDeeplinkSession(args: {
  clinic_id: string;
  secretary_id: string;
  patient_temp_id: string;
  callback_url: string;
  action: "fingerprint" | "read_card";
  device_id?: string; // optionnel si tu gères le ciblage tablette
}) {
  const r = await fetch("/api/deeplink/start", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      clinic_id: args.clinic_id,
      secretary_id: args.secretary_id,
      patient_temp_id: args.patient_temp_id,
      callback_url: args.callback_url,
      device_id: args.device_id,
      action: args.action,
    }),
  });
  if (!r.ok) throw new Error("deeplink/start a échoué");
  return r.json(); // { deeplink_url, expires_at }
}

export async function checkEligibility(args: {
  insurer_id?: string;
  insurer_name?: string;
  patient: { full_name: string; dob: string; national_id?: string };
  membership: { member_no?: string; plan_code?: string };
  facility_id: string;
  idempotency_key: string;
}) {
  const r = await fetch("/api/eligibility", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": args.idempotency_key,
    },
    body: JSON.stringify({
      insurer_id: args.insurer_id,
      insurer_name: args.insurer_name,
      patient: args.patient,
      membership: args.membership,
      facility_id: args.facility_id,
      idempotency_key: args.idempotency_key,
    }),
  });
  if (!r.ok) throw new Error("eligibility a échoué");
  return r.json(); // { status, plan_code, coverage:{...}, verification_level, confidence, insurer_ref, errors }
}

const FUNCTIONS_BASE =
  (import.meta as any).env?.VITE_SUPABASE_URL?.replace(/\/+$/, "") + "/functions/v1";

// --- Nouveau: wrappers RPC (draft + finalisation) ---
export async function createPatientDraft(p0: { full_name: string; dob: string; sex: "M" | "F" | "O"; national_id: string | null; email: string | null; phone: string; is_assured: boolean; }, token: string, args: {
  clinic_id: string;
  full_name: string;
  dob: string; // "YYYY-MM-DD"
  sex?: "M" | "F" | "O";
  national_id?: string | null;
  email?: string | null;
  phone: string;
  created_by?: string;
}): Promise<{ patient_id: string }> {
  const { data, error } = await supabase.rpc("rpc_create_patient_draft", {
    p_clinic_id: args.clinic_id,
    p_full_name: args.full_name,
    p_date_of_birth: args.dob,
    p_sex: args.sex ?? "O",
    p_national_id: args.national_id ?? null,
    p_email: args.email ?? null,
    p_phone: args.phone,
    p_created_by: args.created_by ?? null,
  });
  if (error) throw new Error(error.message);
  return { patient_id: data as string };
}

export async function finalizeUninsured(patientId: string, fingerprintMissing: boolean, token: string, params: {
  patient_id: string;
  fingerprint_captured: boolean;
}): Promise<void> {
  const { error } = await supabase.rpc("rpc_finalize_uninsured", {
    p_patient_id: params.patient_id,
    p_fingerprint_captured: params.fingerprint_captured,
  });
  if (error) throw new Error(error.message);
}

// Rapprochement best-effort avec la base d'adhérents déclarée par
// l'assureur (insurer_member_directory, assureurs N2/N3). Contrat
// volontairement différent de resolveExistingPatient : celle-ci ne doit
// JAMAIS throw, une erreur réseau/edge function dégrade en silence vers
// { matched: false } pour ne jamais bloquer l'enregistrement du patient.
export async function matchInsurerDirectory(
  args: { insurer_id: string; member_no?: string | null; national_id?: string | null },
  token: string
): Promise<{ matched: boolean; plan_code?: string | null; directory_id?: string }> {
  try {
    const r = await fetch(`${FUNCTIONS_BASE}/match-insurer-directory`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(args),
    });
    const json = await r.json();
    if (!r.ok) return { matched: false };
    return json;
  } catch {
    return { matched: false };
  }
}

export async function resolveExistingPatient(
  args: { insurer_id?: string | null; member_no?: string | null; national_id?: string | null },
  token: string
): Promise<{ patient_id: string | null; matched_on?: "member_no" | "national_id" }> {
  const r = await fetch(`${FUNCTIONS_BASE}/resolve-existing-patient`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(args),
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || "Échec de la vérification anti-doublon");
  return json;
}

export async function generatePatientAccessCode(
  patientId: string,
  token: string
): Promise<{ code: string; phone: string; expires_at: string }> {
  const r = await fetch(`${FUNCTIONS_BASE}/generate-patient-access-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ patient_id: patientId }),
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error || "Échec de génération du code");
  return json;
}