import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user is authenticated and is an assurer
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: assurer } = await supabase
      .from('clinic_staff')
      .select('*')
      .eq('id', user.id)
      .eq('role', 'assurer')
      .single();

    if (!assurer) {
      throw new Error('Unauthorized - Not an assurer');
    }

    // Get consultation ID from request body
    const { consultation_id } = await req.json();
    if (!consultation_id) {
      throw new Error('consultation_id is required');
    }

    // Get consultation details
    const { data: consultation, error: consultationError } = await supabase
      .from('consultations')
      .select(`
        *,
        patients (
          name,
          insurance_number,
          insurance_provider
        ),
        clinic_staff (
          name,
          speciality
        ),
        clinics (
          name,
          code
        )
      `)
      .eq('id', consultation_id)
      .single();

    if (consultationError || !consultation) {
      throw new Error('Consultation not found');
    }

    // Verify consultation status
    if (consultation.status !== 'accepted') {
      throw new Error('Cannot process payment for non-accepted consultation');
    }

    // Calculate payment amounts
    const amount = consultation.insurance_coverage?.insurance_amount || 0;
    const commission = Math.ceil(amount * 0.03); // 3% commission
    const total = amount + commission;

    // Record payment
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        consultation_id,
        assurer_id: assurer.id,
        clinic_id: consultation.clinic_id,
        amount,
        commission,
        total_amount: total,
        status: 'completed',
        payment_date: new Date().toISOString(),
        payment_method: 'bank_transfer',
        payment_reference: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        metadata: {
          insurance_provider: consultation.patients?.insurance_provider,
          insurance_number: consultation.patients?.insurance_number,
          clinic_name: consultation.clinics?.name,
          clinic_code: consultation.clinics?.code,
          doctor_name: consultation.clinic_staff?.name,
          doctor_speciality: consultation.clinic_staff?.speciality
        }
      });

    if (paymentError) {
      throw paymentError;
    }

    // Update consultation payment status
    const { error: updateError } = await supabase
      .from('consultations')
      .update({
        payment_status: 'paid',
        payment_date: new Date().toISOString()
      })
      .eq('id', consultation_id);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment processed successfully',
        data: {
          amount,
          commission,
          total,
          payment_date: new Date().toISOString()
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});