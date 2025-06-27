import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
serve(async ()=>{
  const supabase = createClient(Deno.env.get("https://zwxegqevthzfphdqtjew.supabase.co") ?? "", Deno.env.get("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3eGVncWV2dGh6ZnBoZHF0amV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkxMTIyOTksImV4cCI6MjA1NDY4ODI5OX0.WWc-9OorkMK2YMBNAtVYNH0o4BJJndE4OZrSJnLGFKo") ?? "");
  const { data: consultations, error } = await supabase.from("consultations").select("status, insurance_coverage");
  if (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500
    });
  }
  const stats = {
    total: consultations.length,
    amount: 0,
    pending: 0,
    pendingAmount: 0,
    accepted: 0,
    acceptedAmount: 0,
    rejected: 0,
    rejectedAmount: 0
  };
  consultations.forEach((c)=>{
    const amount = c.insurance_coverage?.total_amount || 0;
    stats.amount += amount;
    if (c.status === "pending") {
      stats.pending++;
      stats.pendingAmount += amount;
    } else if (c.status === "accepted") {
      stats.accepted++;
      stats.acceptedAmount += amount;
    } else if (c.status === "rejected") {
      stats.rejected++;
      stats.rejectedAmount += amount;
    }
  });
  return new Response(JSON.stringify(stats), {
    headers: {
      "Content-Type": "application/json"
    }
  });
});
