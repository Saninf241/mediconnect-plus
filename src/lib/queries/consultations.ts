// src/lib/queries/consultations.ts
import { supabase } from "../../lib/supabase";

/** Liste générale des consultations (tables réelles) */
export interface ConsultationRow {
  id: string;
  created_at: string;
  amount: number | null;
  status: string | null;
  patient_name: string;
  patient_is_assured: boolean | null;
  doctor_name: string;
  clinic_name: string;
}

/** Lignes renvoyées par la vue consultations_alerts */
export interface ConsultationAlertRow {
  id: string;
  created_at: string;
  amount: number | null;
  status: string | null;
  patient_name: string;
  patient_is_assured: boolean | null;
  doctor_name: string;
  clinic_name: string;
  anomaly: boolean;
}

/** Lignes renvoyées par la vue consultations_bio_feed */
export interface BiometricFeedRow {
  id: string;
  created_at: string;
  biometric_validated_at: string; // timestamp de validation biométrique
  amount: number | null;
  status: string | null;
  patient_name: string;
  patient_is_assured: boolean | null;
  doctor_name: string;
  clinic_name: string;
}

/**
 * Liste générique des consultations (jointures sur tables).
 * NOTE: champs `name` (patients/clinic_staff), pas `full_name`.
 */
export async function getAllConsultations(): Promise<ConsultationRow[]> {
  const { data, error } = await supabase
    .from("consultations")
    .select(`
      id,
      created_at,
      amount,
      status,
      patients:patient_id (
        id,
        name,
        is_assured
      ),
      doctors:doctor_id (
        id,
        name
      ),
      clinics:clinic_id (
        id,
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur Supabase getAllConsultations:", error);
    return [];
  }

  return (data ?? []).map((c: any) => ({
    id: c.id,
    created_at: c.created_at,
    amount: c.amount ?? 0,
    status: c.status ?? "unknown",
    patient_name: c.patients?.name ?? "Inconnu",
    patient_is_assured: c.patients?.is_assured ?? null,
    doctor_name: c.doctors?.name ?? "Inconnu",
    clinic_name: c.clinics?.name ?? "Inconnu",
  }));
}

/**
 * Alertes "Assuré sans empreinte" -> lit la VUE `consultations_alerts`
 * (la logique d'alerte est en base, pas dans le front).
 */
export async function getFingerprintAlerts(): Promise<ConsultationAlertRow[]> {
  const { data, error } = await supabase
    .from("consultations_alerts")
    .select(
      "id, created_at, amount, status, patient_name, patient_is_assured, doctor_name, clinic_name, anomaly"
    )
    .eq("anomaly", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erreur Supabase getFingerprintAlerts:", error);
    return [];
  }
  return (data ?? []) as ConsultationAlertRow[];
}

/**
 * Flux des validations biométriques -> lit la VUE `consultations_bio_feed`.
 * Utilise `since` (ISO string) pour filtrer côté client si besoin.
 */
export async function getRecentFingerprintValidations(
  { since }: { since?: string } = {}
): Promise<BiometricFeedRow[]> {
  const { data, error } = await supabase
    .from("consultations_bio_feed")
    .select(
      "id, created_at, biometric_validated_at, amount, status, patient_name, patient_is_assured, doctor_name, clinic_name"
    )
    .order("biometric_validated_at", { ascending: false });

  if (error) {
    console.error("Erreur Supabase getRecentFingerprintValidations:", error);
    return [];
  }

  const rows = (data ?? []) as BiometricFeedRow[];
  if (!since) return rows;

  const sinceDate = new Date(since);
  return rows.filter((r) => new Date(r.biometric_validated_at) >= sinceDate);
}
