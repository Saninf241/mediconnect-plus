// supabase/functions/patient-portal-data/index.ts
// Point d'entrée unique de l'espace patient : vérifie la session Supabase
// Auth du patient (téléphone + OTP), retrouve sa fiche via auth_user_id et
// renvoie uniquement ses propres données.
//
// Volontairement absent de la réponse : le contenu clinique brut
// (diagnostic, notes du médecin, antécédents en texte libre). Le patient
// voit le fait qu'une consultation a eu lieu, où, avec qui, et le suivi
// administratif (ordonnances, traitements, remboursement) — pas le dossier
// clinique complet tel que le voit le médecin.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401,
        headers: cors,
      });
    }

    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select(
        "id, name, phone, date_of_birth, sex, last_visit_date, is_assured, status"
      )
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();

    if (patientError || !patient) {
      return new Response(
        JSON.stringify({ error: "Aucun dossier patient relié à ce compte" }),
        { status: 404, headers: cors }
      );
    }

    const [memberships, consultations, prescriptions, receipts] = await Promise.all([
      supabase
        .from("insurer_memberships")
        .select(
          "id, member_no, plan_code, coverage_start, coverage_end, status, is_active, insurers(name)"
        )
        .eq("patient_id", patient.id)
        .eq("is_active", true)
        .order("last_verified_at", { ascending: false }),
      supabase
        .from("consultations")
        .select(
          "id, created_at, consultation_type, status, payment_status, amount, insurer_amount, patient_amount, insurer_decision_at, rejection_reason, next_visit_date, clinics(name), clinic_staff(name, speciality)"
        )
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("prescriptions")
        .select("id, content, printed_once, created_at, clinic_staff(name)")
        .eq("patient_id", patient.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("pharmacy_receipts")
        .select("*")
        .eq("patient_id", patient.id)
        .order("receipt_date", { ascending: false }),
    ]);

    const consultationIds = (consultations.data || []).map((c) => c.id);
    const { data: medications } = consultationIds.length
      ? await supabase
          .from("consultation_medications")
          .select("id, name, dosage, form, duration, instructions, created_at, consultation_id")
          .in("consultation_id", consultationIds)
          .order("created_at", { ascending: false })
      : { data: [] };

    const consultationsPublic = (consultations.data || []).map((c) => ({
      id: c.id,
      created_at: c.created_at,
      type: c.consultation_type || "Consultation",
      clinic_name: (c as any).clinics?.name ?? null,
      doctor_name: (c as any).clinic_staff?.name ?? null,
      doctor_speciality: (c as any).clinic_staff?.speciality ?? null,
      next_visit_date: c.next_visit_date,
    }));

    const claimsPublic = (consultations.data || []).map((c) => ({
      id: c.id,
      created_at: c.created_at,
      status: c.status,
      payment_status: c.payment_status,
      amount: c.amount,
      insurer_amount: c.insurer_amount,
      patient_amount: c.patient_amount,
      insurer_decision_at: c.insurer_decision_at,
      rejection_reason: c.rejection_reason,
    }));

    return new Response(
      JSON.stringify({
        identity: patient,
        coverage: memberships.data || [],
        consultations: consultationsPublic,
        claims: claimsPublic,
        prescriptions: prescriptions.data || [],
        treatments: medications || [],
        pharmacyReceipts: receipts.data || [],
      }),
      { headers: { "Content-Type": "application/json", ...cors } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 400, headers: cors });
  }
});
