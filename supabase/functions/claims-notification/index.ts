import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  try {
    const claim = await req.json();
    if (!claim) {
      return new Response(JSON.stringify({
        error: 'Missing claim data'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    // Conversion souple de "sent" vers "sent" pour rester compatible
    if (claim.status === 'sent') {
      claim.status = 'sent';
    }
    // Format montant
    const formattedAmount = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF'
    }).format(claim.amount);
    // Format date
    const formattedDate = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'long',
      timeStyle: 'short'
    }).format(new Date(claim.sent_at));
    // Contenu email
    const emailContent = `
      Nouvelle demande de remboursement soumise

      Identifiant: ${claim.id}
      Patient: ${claim.patient.name}
      Acte: ${claim.procedure}
      Montant: ${formattedAmount}
      Date: ${formattedDate}

      Consultez la demande: https://${Deno.env.get('DOMAIN')}/assureur/claims
    `;
    // Envoi email (vérifie si supabase.auth.admin.sendEmail est bien dispo dans ton projet)
    const { error: emailError } = await supabase.auth.admin.sendEmail(claim.assurer_email, 'Nouvelle demande de remboursement soumise', emailContent);
    if (emailError) throw emailError;
    // Notification en temps réel
    const { error: realtimeError } = await supabase.from('notifications').insert({
      user_id: claim.assurer_id,
      type: 'claim_sent',
      title: 'Nouvelle demande de remboursement',
      content: `Une nouvelle demande de ${formattedAmount} a été soumise pour ${claim.patient.name}`,
      metadata: {
        claim_id: claim.id,
        amount: claim.amount,
        patient_name: claim.patient.name
      },
      read: false
    });
    if (realtimeError) throw realtimeError;
    return new Response(JSON.stringify({
      success: true
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error processing claim notification:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});
