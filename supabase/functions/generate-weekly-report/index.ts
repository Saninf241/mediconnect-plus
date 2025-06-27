import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import { jsPDF } from "npm:jspdf@2.5.1";
import Chart from "npm:chart.js@4.4.1";
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

    // Get consultations from the past 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: consultations, error: consultationsError } = await supabase
      .from('consultations')
      .select(`
        *,
        clinics (
          name,
          code
        ),
        clinic_staff (
          name,
          speciality
        )
      `)
      .gte('created_at', sevenDaysAgo.toISOString())
      .eq('insurance_provider', assurer.clinic_id);

    if (consultationsError) {
      throw consultationsError;
    }

    // Calculate insights
    const totalClaims = consultations.length;
    const totalAmount = consultations.reduce((sum, c) => {
      const coverage = c.insurance_coverage as any;
      return sum + (coverage?.total_amount || 0);
    }, 0);
    
    // Breakdown by clinic
    const clinicBreakdown = consultations.reduce((acc, c) => {
      const clinicName = c.clinics?.name || 'Unknown';
      const coverage = c.insurance_coverage as any;
      acc[clinicName] = (acc[clinicName] || 0) + (coverage?.total_amount || 0);
      return acc;
    }, {} as Record<string, number>);

    // Calculate average delay
    const delays = consultations
      .filter(c => c.status === 'completed')
      .map(c => {
        const start = new Date(c.created_at);
        const end = new Date(c.updated_at);
        return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24); // days
      });
    const averageDelay = delays.length > 0 
      ? delays.reduce((a, b) => a + b, 0) / delays.length 
      : 0;

    // Find clinics with high rejection rates
    const clinicRejections = consultations.reduce((acc, c) => {
      const clinicName = c.clinics?.name || 'Unknown';
      if (!acc[clinicName]) {
        acc[clinicName] = { total: 0, rejected: 0 };
      }
      acc[clinicName].total++;
      if (c.status === 'rejected') {
        acc[clinicName].rejected++;
      }
      return acc;
    }, {} as Record<string, { total: number; rejected: number }>);

    const highRejectionClinics = Object.entries(clinicRejections)
      .filter(([_, stats]) => (stats.rejected / stats.total) > 0.2)
      .map(([name]) => name);

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Header
    doc.setFontSize(20);
    doc.text('Rapport Hebdomadaire de Remboursement', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Généré le ${format(new Date(), 'PPP')}`, pageWidth / 2, 30, { align: 'center' });

    // Key Metrics
    doc.setFontSize(14);
    doc.text('Indicateurs Clés', 20, 50);
    doc.setFontSize(12);
    doc.text(`Nombre total de dossiers: ${totalClaims}`, 30, 60);
    doc.text(`Montant total: ${totalAmount.toLocaleString()} FCFA`, 30, 70);
    doc.text(`Délai moyen de traitement: ${averageDelay.toFixed(1)} jours`, 30, 80);

    // Breakdown by Clinic
    doc.setFontSize(14);
    doc.text('Répartition par Établissement', 20, 100);
    doc.setFontSize(12);
    Object.entries(clinicBreakdown).forEach(([clinic, amount], index) => {
      doc.text(`${clinic}: ${amount.toLocaleString()} FCFA`, 30, 110 + (index * 10));
    });

    // High Rejection Clinics
    if (highRejectionClinics.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(220, 53, 69); // Red color for warning
      doc.text('⚠️ Taux de Rejet Élevé', 20, 160);
      doc.setFontSize(12);
      highRejectionClinics.forEach((clinic, index) => {
        doc.text(`${clinic}`, 30, 170 + (index * 10));
      });
      doc.setTextColor(0, 0, 0); // Reset color
    }

    // Footer
    doc.setFontSize(10);
    doc.text('MediConnect+ - Rapport Confidentiel', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Save PDF to Supabase Storage
    const weekNumber = format(new Date(), 'w');
    const year = new Date().getFullYear();
    const fileName = `weekly-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    const filePath = `reports/${assurer.clinic_id}/${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('weekly-reports')
      .upload(filePath, doc.output('blob'), {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL for the report
    const { data: { publicUrl } } = supabase.storage
      .from('weekly-reports')
      .getPublicUrl(filePath);

    // Send email notification (placeholder - implement with your email service)
    console.log(`Report generated and available at: ${publicUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        metrics: {
          totalClaims,
          totalAmount,
          averageDelay,
          highRejectionClinics
        }
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