// src/hooks/usePatientPortalData.ts
import { useEffect, useState } from "react";
import { supabasePatient, getSupabaseFunctionsUrl } from "../lib/supabasePatient";
import { usePatientSession } from "./usePatientSession";

export type PatientPortalData = {
  identity: {
    id: string;
    name: string;
    phone: string | null;
    date_of_birth: string;
    sex: string | null;
    last_visit_date: string | null;
    is_assured: boolean | null;
    status: string | null;
  };
  coverage: Array<{
    id: string;
    member_no: string | null;
    plan_code: string | null;
    coverage_start: string | null;
    coverage_end: string | null;
    status: string | null;
    is_active: boolean | null;
    insurers: { name: string } | null;
  }>;
  consultations: Array<{
    id: string;
    created_at: string;
    type: string;
    clinic_name: string | null;
    doctor_name: string | null;
    doctor_speciality: string | null;
    next_visit_date: string | null;
  }>;
  claims: Array<{
    id: string;
    created_at: string;
    status: string | null;
    payment_status: string | null;
    amount: number | null;
    insurer_amount: number | null;
    patient_amount: number | null;
    insurer_decision_at: string | null;
    rejection_reason: string | null;
  }>;
  prescriptions: Array<{
    id: string;
    content: string;
    printed_once: boolean | null;
    created_at: string;
    clinic_staff: { name: string } | null;
  }>;
  treatments: Array<{
    id: string;
    name: string;
    dosage: string;
    form: string;
    duration: string | null;
    instructions: string | null;
    created_at: string;
  }>;
  pharmacyReceipts: Array<Record<string, any>>;
};

export function usePatientPortalData() {
  const { session, loading: sessionLoading } = usePatientSession();
  const [data, setData] = useState<PatientPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;

    if (!session) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(getSupabaseFunctionsUrl("patient-portal-data"), {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Erreur de chargement");
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Erreur inattendue");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, sessionLoading]);

  return { data, loading: sessionLoading || loading, error, session, supabasePatient };
}
