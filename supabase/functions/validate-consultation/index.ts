import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
serve(async (req)=>{
  const { id, status, rejection_reason } = await req.json();
  if (!id || ![
    "accepted",
    "rejected"
  ].includes(status)) {
    return new Response(JSON.stringify({
      error: "Invalid input"
    }), {
      status: 400
    });
  }
  const supabase = createClient(Deno.env.get("https://zwxegqevthzfphdqtjew.supabase.co") ?? "", Deno.env.get("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eGVncWV2dGh6ZnBoZHF0amV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTExMjI5OSwiZXhwIjoyMDU0Njg4Mjk5fQ.qXu29r14dphkDnehU0IkoEb5RW6ZNTqScBQuGuroNlg") ?? "" // 🔐 Clé service sécurisée
  );
  const updates = {
    status,
    validated_at: new Date().toISOString(),
    rejection_reason: status === "rejected" ? rejection_reason ?? "" : null
  };
  const { error } = await supabase.from("consultations").update(updates).eq("id", id);
  if (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500
    });
  }
  return new Response(JSON.stringify({
    success: true
  }), {
    headers: {
      "Content-Type": "application/json"
    }
  });
});
