// supabase/functions/generate-consultation-pdf/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";
import jsPDF from "https://esm.sh/jspdf@2.5.1";

// ✅ CORS pour que le navigateur accepte la requête
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 🔹 Réponse au preflight OPTIONS (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const consultationId = body.consultationId as string | undefined;

    if (!consultationId) {
      return new Response(
        JSON.stringify({ error: "Missing consultationId" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, serviceKey);

    // 1) On récupère les infos de la consultation + patient + médecin + clinique
    const { data: consultation, error: cError } = await client
      .from("consultations")
      .select(
        `
        id,
        created_at,
        amount,
        status,
        patients ( name, insurance_number ),
        clinics ( name ),
        clinic_staff ( name )
      `
      )
      .eq("id", consultationId)
      .single();

    if (cError || !consultation) {
      console.error("Consultation not found:", cError);
      return new Response(
        JSON.stringify({ error: "Consultation not found" }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // 2) Génération d’un PDF simple (on enrichira plus tard)
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Fiche consultation Mediconnect+", 10, 20);

    doc.setFontSize(11);
    doc.text(`ID consultation : ${consultation.id}`, 10, 30);
    doc.text(
      `Date : ${new Date(consultation.created_at).toLocaleString()}`,
      10,
      38
    );
    doc.text(
      `Patient : ${consultation.patients?.name ?? "-"}`,
      10,
      48
    );
    doc.text(
      `N° assuré : ${consultation.patients?.insurance_number ?? "-"}`,
      10,
      56
    );
    doc.text(
      `Médecin : ${consultation.clinic_staff?.name ?? "-"}`,
      10,
      66
    );
    doc.text(
      `Établissement : ${consultation.clinics?.name ?? "-"}`,
      10,
      74
    );
    doc.text(`Montant : ${consultation.amount ?? 0} FCFA`, 10, 84);
    doc.text(`Statut : ${consultation.status}`, 10, 92);

    const pdfBytes = doc.output("arraybuffer");

    // 3) Upload dans le bucket Supabase Storage
    const bucket = "consultation-files"; // ✅ tu l’as déjà créé
    const filename = `consultation-${consultationId}.pdf`;

    const { error: upError } = await client.storage
      .from(bucket)
      .upload(filename, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (upError) {
      console.error("Upload error:", upError);
      return new Response(
        JSON.stringify({ error: "Upload failed" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: pub } = client.storage
      .from(bucket)
      .getPublicUrl(filename);

    const publicUrl = pub.publicUrl;

    // 4) Mise à jour de consultations.pdf_url
    const { error: updError } = await client
      .from("consultations")
      .update({ pdf_url: publicUrl })
      .eq("id", consultationId);

    if (updError) {
      console.error("Update pdf_url error:", updError);
      return new Response(
        JSON.stringify({ error: "Update pdf_url failed" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, pdf_url: publicUrl }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
