// src/lib/queries/subscription.ts
import { supabase } from '../supabase';

export async function getDoctorSubscription(doctorId: string) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[getDoctorSubscription] Supabase error:', error.message);
    return null;
  }

  // Vérifie si la date de fin est encore valide
  const now = new Date();
  if (data && data.end_date && new Date(data.end_date) >= now) {
    return {
      isActive: true,
      planType: data.plan_type,
      engagement: data.engagement_months,
      maintenance: data.maintenance_included,
      price: data.monthly_price,
      testMode: data.test_mode ?? false,
    };
  } else {
    return {
      isActive: false,
      planType: null,
      engagement: null,
      maintenance: false,
      price: 0,
      testMode: false,
    };
  }
}
