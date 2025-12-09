// supabase/functions/generate-consultation-pdf/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import jsPDF from "https://esm.sh/jspdf@2.5.1";

serve(async (req) => {
  // --- 1) Préflight CORS ---
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // --- 2) Lecture du body ---
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const consultationId = body.consultationId as string | undefined;
  if (!consultationId) {
    console.error("[generate-consultation-pdf] Missing consultationId");
    return new Response("Missing consultationId", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // --- 3) Charger la consultation + jointures ---
  const { data: cons, error } = await supabase
    .from("consultations")
    .select(
      `
        id,
        created_at,
        amount,
        status,
        acts,
        medications,
        patients ( name ),
        clinic_staff ( name ),
        clinics ( name )
      `
    )
    .eq("id", consultationId)
    .maybeSingle();

  if (error || !cons) {
    console.error("[generate-consultation-pdf] consultation not found:", error);
    return new Response("Consultation not found", { status: 404 });
  }

  const patientName = cons.patients?.name ?? "-";
  const doctorName = cons.clinic_staff?.name ?? "-";
  const clinicName = cons.clinics?.name ?? "-";
  const amount = cons.amount ?? 0;
  const status = cons.status ?? "-";
  const createdAt = cons.created_at
    ? new Date(cons.created_at).toLocaleString("fr-FR")
    : "-";

  // sécuriser actes / médicaments
  const acts: any[] = Array.isArray(cons.acts) ? cons.acts : [];
  const meds: any[] = Array.isArray(cons.medications) ? cons.medications : [];

  // --- 4) Génération PDF ---
  const doc = new jsPDF();
  let y = 20;
  const lh = 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Fiche consultation Mediconnect+", 20, y);
  y += lh * 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  doc.text(`ID consultation : ${cons.id}`, 20, y);
  y += lh;
  doc.text(`Date : ${createdAt}`, 20, y);
  y += lh * 2;

  doc.text(`Patient : ${patientName}`, 20, y);
  y += lh;
  doc.text(`Médecin : ${doctorName}`, 20, y);
  y += lh;
  doc.text(`Établissement : ${clinicName}`, 20, y);
  y += lh * 2;

  doc.text(`Montant : ${amount} FCFA`, 20, y);
  y += lh;
  doc.text(`Statut : ${status}`, 20, y);
  y += lh * 2;

  // --- Actes ---
  doc.setFont("helvetica", "bold");
  doc.text("Actes médicaux :", 20, y);
  y += lh;
  doc.setFont("helvetica", "normal");

  if (acts.length === 0) {
    doc.text("- Aucun acte renseigné", 25, y);
    y += lh;
  } else {
    for (const a of acts) {
      const label =
        typeof a === "string"
          ? a
          : a?.type || a?.label || JSON.stringify(a);
      doc.text(`- ${label}`, 25, y);
      y += lh;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }
  }

  y += lh;

  // --- Médicaments ---
  doc.setFont("helvetica", "bold");
  doc.text("Médicaments :", 20, y);
  y += lh;
  doc.setFont("helvetica", "normal");

  if (meds.length === 0) {
    doc.text("- Aucun médicament renseigné", 25, y);
    y += lh;
  } else {
    for (const m of meds) {
      const label =
        typeof m === "string"
          ? m
          : m?.name || m?.label || JSON.stringify(m);
      doc.text(`- ${label}`, 25, y);
      y += lh;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }
  }

  // --- 5) Upload dans le bucket ---
  const pdfBytes = doc.output("arraybuffer");
  const fileName = `consultation-${consultationId}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from("consultation-files")
    .upload(fileName, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    console.error("[generate-consultation-pdf] upload error:", uploadError);
    return new Response("Upload failed", { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("consultation-files").getPublicUrl(fileName);

  const { error: updateError } = await supabase
    .from("consultations")
    .update({ pdf_url: publicUrl })
    .eq("id", consultationId);

  if (updateError) {
    console.error("[generate-consultation-pdf] update pdf_url error:", updateError);
    return new Response("Update pdf_url failed", { status: 500 });
  }

  return new Response(
    JSON.stringify({ pdf_url: publicUrl }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
});
