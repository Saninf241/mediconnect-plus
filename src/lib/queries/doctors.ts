import { supabase } from '../supabase';

export async function getDoctorPerformance(doctorId: string) {
  const { data, error } = await supabase
    .rpc('get_doctor_performance', { input_doctor_id: doctorId });

  if (error) {
    console.error('[getDoctorPerformance] Supabase error:', error.message);
    return null;
  }

  return data;
}
