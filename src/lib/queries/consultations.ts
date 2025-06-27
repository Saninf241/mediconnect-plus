import { supabase } from "../../lib/supabase";

export async function getAllConsultations() {
  const { data, error } = await supabase
    .from('consultations')
    .select(`
      id,
      created_at,
      amount,
      status,
      anomaly,
      fingerprint_missing,
      patient:patients (
        id,
        name
      ),
      doctor:clinic_staff (
        id,
        name
      ),
      clinic:clinics (
        id,
        name
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erreur lors de la récupération des consultations :', error);
    return [];
  }

  return data.map(c => ({
    id: c.id,
    created_at: c.created_at,
    amount: c.amount,
    status: c.status,
    anomaly: c.anomaly || false,
    fingerprint_missing: c.fingerprint_missing || false,
    patient_name: c.patient?.name || 'Inconnu',
    doctor_name: c.doctor?.name || 'Inconnu',
    clinic_name: c.clinic?.name || 'Inconnu',
  }));
}
