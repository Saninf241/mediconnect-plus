import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import { format } from "npm:date-fns@2.30.0";

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
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get the assurer's details
    const { data: assurer, error: assurerError } = await supabase
      .from('clinic_staff')
      .select('*')
      .eq('id', user.id)
      .eq('role', 'assurer')
      .single();

    if (assurerError || !assurer) {
      throw new Error('Unauthorized - Not an assurer');
    }

    // Get the latest report
    const fileName = `weekly-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    const filePath = `reports/${assurer.clinic_id}/${fileName}`;

    const { data: { publicUrl } } = supabase.storage
      .from('weekly-reports')
      .getPublicUrl(filePath);

    // Send email (placeholder - implement with your email service)
    const emailContent = {
      to: assurer.email,
      subject: `Votre rapport MediConnect+ - Semaine ${format(new Date(), 'w')}`,
      html: `
        <h2>Bonjour,</h2>
        <p>Votre rapport hebdomadaire de remboursement est disponible.</p>
        <p>Vous pouvez le télécharger en cliquant sur le lien ci-dessous :</p>
        <p><a href="${publicUrl}">Télécharger le rapport</a></p>
        <p>Cordialement,<br>L'équipe MediConnect+</p>
      `
    };

    // Log email content for testing
    console.log('Email would be sent:', emailContent);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email notification sent successfully',
        reportUrl: publicUrl
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
      JSON.stringify({ error: error.message }),
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