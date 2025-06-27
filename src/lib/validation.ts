import { supabase } from './supabase';
import { toast } from 'react-toastify';

export async function validateConsultation(
  consultationId: string,
  status: 'accepted' | 'rejected',
  rejectionReason?: string
): Promise<boolean> {
  try {
    const { error: updateError } = await supabase
      .from('consultations')
      .update({
        status,
        rejection_reason: rejectionReason,
        validated_at: new Date().toISOString()
      })
      .eq('id', consultationId);

    if (updateError) throw updateError;

    toast.success(
      status === 'accepted' 
        ? 'Consultation validée avec succès'
        : 'Consultation rejetée avec succès'
    );

    return true;
  } catch (err) {
    console.error('Error validating consultation:', err);
    toast.error('Une erreur est survenue lors de la validation');
    return false;
  }
}