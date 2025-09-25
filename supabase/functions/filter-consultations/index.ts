/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Autoriser tous les domaines pour le frontend
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { search, status, clinicId, dateStart, dateEnd } = body;

    let query = supabase
      .from("consultations")
      .select(
        `
        id,
        created_at,
        amount,
        status,
        pdf_url,
        patients ( name ),
        clinic_staff ( name ),
        clinics ( name )
      `
      )
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (clinicId) query = query.eq("clinic_id", clinicId);
    if (dateStart) query = query.gte("created_at", dateStart);
    if (dateEnd) query = query.lte("created_at", dateEnd + "T23:59:59");

    const { data, error } = await query;
    if (error) throw error;

    // 🔍 Filtrage par texte si présent
    let filtered = data;
    if (search?.trim()) {
      const text = search.toLowerCase();
      filtered = data.filter(
        (item) =>
          item.patients?.name?.toLowerCase().includes(text) ||
          item.clinic_staff?.name?.toLowerCase().includes(text) ||
          item.clinics?.name?.toLowerCase().includes(text)
      );
    }

    // 📩 Comptage des messages non lus (pour assureur)
    const consultationsWithUnread = await Promise.all(
      filtered.map(async (item) => {
        const { data: unread } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("consultation_id", item.id)
          .eq("is_read", false)
          .eq("receiver_role", "insurer");

        return {
          ...item,
          unread_messages_count: unread?.length ?? 0,
        };
      })
    );

    return new Response(
      JSON.stringify({ data: consultationsWithUnread }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (e) {
    console.error("⛔ Erreur Edge Function :", e);
    return new Response(
      JSON.stringify({ error: "Erreur interne", details: e.message }),
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
