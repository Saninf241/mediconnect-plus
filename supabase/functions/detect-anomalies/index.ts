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
    const supabase = createClient(
      "https://abcdeqysixsupabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eGVncWV2dGh6ZnBoZHF0amV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTExMjI5OSwiZXhwIjoyMDU0Njg4Mjk5fQ.qXu29r14dphkDnehU0IkoEb5RW6ZNTqScBQuGuroNlg"
    );

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get assurer details
    const { data: assurer, error: assurerError } = await supabase
      .from('clinic_staff')
      .select('*')
      .eq('id', user.id)
      .eq('role', 'assurer')
      .single();

    if (assurerError || !assurer) {
      throw new Error('Unauthorized - Not an assurer');
    }

    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    const { data: consultations, error } = await supabase
      .from("consultations")
      .select(`
        id,
        patient_id,
        clinic_id,
        created_at,
        updated_at,
        insurance_coverage,
        biometric_validation,
        patients (
          name,
          insurance_number
        ),
        clinics (
          name,
          code
        )
      `)
      .gte("created_at", sevenDaysAgo.toISOString());

    if (error) throw error;

    const alerts = [];

    // 1. Multiple clinics same day
    const patientVisits = new Map<string, Set<string>>();

    for (const c of consultations) {
      const date = new Date(c.created_at).toISOString().split("T")[0];
      const key = `${c.patient_id}-${date}`;
      
      if (!patientVisits.has(key)) {
        patientVisits.set(key, new Set([c.clinic_id]));
      } else {
        const clinics = patientVisits.get(key)!;
        if (!clinics.has(c.clinic_id)) {
          alerts.push({
            type: 'warning',
            message: `Patient ${c.patients?.name} (${c.patients?.insurance_number}) consulté dans plusieurs établissements le ${new Date(date).toLocaleDateString('fr-FR')}`,
            consultation_id: c.id
          });
        }
        clinics.add(c.clinic_id);
      }
    }

    // 2. Missing biometric validation
    for (const c of consultations) {
      if (!c.biometric_validation) {
        alerts.push({
          type: 'error',
          message: `Consultation sans validation biométrique - Patient ${c.patients?.name} à ${c.clinics?.name}`,
          consultation_id: c.id
        });
      }
    }

    // 3. Rapid succession consultations
    const sortedByClinic = new Map<string, typeof consultations>();
    for (const c of consultations) {
      if (!sortedByClinic.has(c.clinic_id)) {
        sortedByClinic.set(c.clinic_id, []);
      }
      sortedByClinic.get(c.clinic_id)!.push(c);
    }

    for (const clinicConsultations of sortedByClinic.values()) {
      const sorted = clinicConsultations.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        const timeDiff = (new Date(curr.created_at).getTime() - new Date(prev.created_at).getTime()) / (1000 * 60);
        
        if (timeDiff < 15) {
          alerts.push({
            type: 'warning',
            message: `Consultations rapprochées (${Math.round(timeDiff)} minutes) à ${curr.clinics?.name}`,
            consultation_id: curr.id
          });
        }
      }
    }

    // 4. Unusual activity volume
    const clinicVolumes = new Map<string, number>();
    for (const c of consultations) {
      clinicVolumes.set(c.clinic_id, (clinicVolumes.get(c.clinic_id) || 0) + 1);
    }

    const avgDailyThreshold = 20; // Seuil moyen de consultations par jour
    const daysInPeriod = 7;

    for (const [clinicId, count] of clinicVolumes.entries()) {
      const avgDaily = count / daysInPeriod;
      if (avgDaily > avgDailyThreshold) {
        const clinic = consultations.find(c => c.clinic_id === clinicId)?.clinics;
        alerts.push({
          type: 'warning',
          message: `Volume inhabituel de consultations à ${clinic?.name} (${Math.round(avgDaily)} consultations/jour)`,
          consultation_id: null
        });
      }
    }

    // Save alerts and create notification
    if (alerts.length > 0) {
      // Save alerts
      for (const alert of alerts) {
        const { error: insertError } = await supabase
          .from('alerts')
          .insert(alert);

        if (insertError) {
          console.error('Error saving alert:', insertError);
        }
      }

      // Create notification for the assurer
      await supabase.from("notifications").insert({
        title: "Dérives détectées",
        content: `⚠️ ${alerts.length} dérive(s) trouvée(s) cette semaine`,
        type: "anomaly",
        user_id: assurer.id,
        metadata: {
          alerts_count: alerts.length,
          alert_types: alerts.map(a => a.type)
        }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        alerts_count: alerts.length,
        alerts
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
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});