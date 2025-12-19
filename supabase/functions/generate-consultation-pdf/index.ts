// supabase/functions/generate-consultation-pdf/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import jsPDF from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = {
  "Content-Type": "application/json",
  ...corsHeaders,
};

serve(async (req) => {
  // Pré-vol CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: jsonHeaders },
    );
  }

  // ----- Lecture du body -----
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: jsonHeaders },
    );
  }

  const consultationId = body.consultationId as string | undefined;
  if (!consultationId) {
    return new Response(
      JSON.stringify({ error: "Missing consultationId" }),
      { status: 400, headers: jsonHeaders },
    );
  }

  // ----- Supabase service role -----
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1) Récupérer la consultation + relations existantes
  const { data: c, error: fetchError } = await supabase
    .from("consultations")
    .select(`
      id,
      created_at,
      amount,
      status,
      acts,
      medications,
      diagnosis_code_text,
      diagnosis_code:diagnosis_codes ( code, title ),
      patients ( name ),
      clinic_staff ( name ),
      clinics ( name )
    `)
    .eq("id", consultationId)
    .single();

  if (fetchError || !c) {
    console.error("[generate-consultation-pdf] fetch error", fetchError);
    return new Response(
      JSON.stringify({
        error: "Consultation fetch failed",
        details: fetchError?.message ?? fetchError,
      }),
      { status: 404, headers: jsonHeaders },
    );
  }

  // 2) Génération du PDF
  const pdf = new jsPDF();
  let y = 20;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("Fiche consultation Mediconnect+", 10, y);
  y += 12;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);

  const safe = (v: any, fallback = "-") =>
    v === null || v === undefined || v === "" ? fallback : String(v);

  pdf.text(`ID consultation : ${c.id}`, 10, y); y += 7;

  const dateStr = new Date(c.created_at).toLocaleString("fr-FR");
  pdf.text(`Date : ${dateStr}`, 10, y); y += 7;

  pdf.text(`Patient : ${safe(c.patients?.name)}`, 10, y); y += 7;
  pdf.text(`Médecin : ${safe(c.clinic_staff?.name)}`, 10, y); y += 7;
  pdf.text(`Établissement : ${safe(c.clinics?.name)}`, 10, y); y += 7;
  pdf.text(`Montant : ${safe(c.amount)} FCFA`, 10, y); y += 7;
  pdf.text(`Statut : ${safe(c.status)}`, 10, y); y += 10;

    // ----- Affection / Diagnostic codifié -----
  const diagnosisLabel =
    safe((c as any).diagnosis_code_text, "").trim() ||
    (() => {
      const dc = (c as any).diagnosis_code;
      if (dc?.code || dc?.title) return `${safe(dc?.code)} - ${safe(dc?.title)}`.trim();
      return "";
    })();

  pdf.setFont("helvetica", "bold");
  pdf.text("Affection(s) / Diagnostic codifié :", 10, y);
  y += 7;

  pdf.setFont("helvetica", "normal");
  if (!diagnosisLabel) {
    pdf.text("- Non renseigné", 12, y);
    y += 6;
  } else {
    // split si c'est long
    const lines = pdf.splitTextToSize(diagnosisLabel, 180);
    for (const line of lines) {
      pdf.text(line, 12, y);
      y += 6;
      if (y > 280) {
        pdf.addPage();
        y = 20;
      }
    }
  }
  y += 4;

  // ----- Actes -----
  pdf.setFont("helvetica", "bold");
  pdf.text("Actes réalisés :", 10, y);
  y += 7;

  pdf.setFont("helvetica", "normal");
  const acts = (c.acts as any[]) || [];
  if (!acts.length) {
    pdf.text("- Aucun acte déclaré", 12, y);
    y += 6;
  } else {
    for (const act of acts) {
      const label =
        act?.type ||
        act?.label ||
        act?.code ||
        act?.name ||
        JSON.stringify(act);
      pdf.text(`- ${label}`, 12, y);
      y += 6;
      if (y > 280) {
        pdf.addPage();
        y = 20;
      }
    }
  }

  y += 4;

  // ----- Médicaments -----
  pdf.setFont("helvetica", "bold");
  pdf.text("Médicaments :", 10, y);
  y += 7;

  pdf.setFont("helvetica", "normal");
  const meds = (c.medications as any[]) || [];
  if (!meds.length) {
    pdf.text("- Aucun médicament déclaré", 12, y);
    y += 6;
  } else {
    for (const m of meds) {
      const label =
        typeof m === "string"
          ? m
          : m?.name || m?.label || JSON.stringify(m);
      pdf.text(`- ${label}`, 12, y);
      y += 6;
      if (y > 280) {
        pdf.addPage();
        y = 20;
      }
    }
  }

  // 3) Upload dans le bucket
  const pdfBytes = pdf.output("arraybuffer");
  const fileName = `consultation-${consultationId}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("consultation-files")
    .upload(fileName, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("[generate-consultation-pdf] upload error", uploadError);
    return new Response(
      JSON.stringify({ error: "Storage upload failed", details: uploadError }),
      { status: 500, headers: jsonHeaders },
    );
  }

  const publicUrl = supabase
    .storage
    .from("consultation-files")
    .getPublicUrl(fileName).data.publicUrl;

  // 4) Mise à jour de la consultation
  const { error: updateError } = await supabase
    .from("consultations")
    .update({ pdf_url: publicUrl })
    .eq("id", consultationId);

  if (updateError) {
    console.error("[generate-consultation-pdf] update error", updateError);
    return new Response(
      JSON.stringify({ error: "DB update failed", details: updateError }),
      { status: 500, headers: jsonHeaders },
    );
  }

  return new Response(
    JSON.stringify({ pdfUrl: publicUrl }),
    { status: 200, headers: jsonHeaders },
  );
});
