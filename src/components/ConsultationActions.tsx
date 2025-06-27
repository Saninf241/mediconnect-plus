import React, { useState } from 'react';
import { 
  CheckCircle, Edit, FileSignature, Send, FileText, 
  AlertCircle, Loader2, Lock 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generatePatientReport } from '../lib/pdf';
import { transmitReportToInsurance } from '../lib/insurance-api';
import type { InsuranceProvider } from '../lib/insurance-api';

interface ConsultationActionsProps {
  consultation: any;
  patient: any;
  doctor: any;
  medications: any[];
  examinations: any[];
  onStatusChange: (newStatus: string) => void;
}

export function ConsultationActions({ 
  consultation, 
  patient,
  doctor,
  medications,
  examinations,
  onStatusChange 
}: ConsultationActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFinalize = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Calculer le montant total
      const medicationsTotal = medications.reduce((sum, med) => sum + (med.price || 0), 0);
      const examinationsTotal = examinations.reduce((sum, exam) => sum + (exam.price || 0), 0);
      const totalAmount = (consultation.amount || 25000) + medicationsTotal + examinationsTotal;

      // Préparer les données de mise à jour
      const updateData = {
        status: 'completed',
        updated_at: new Date().toISOString(),
        amount: totalAmount,
        consultation_medications: medications,
        consultation_examinations: examinations,
        insurance_coverage: patient.insurance_provider ? {
          provider: patient.insurance_provider,
          coverage_rate: 0.8,
          patient_share: 0.2,
          total_amount: totalAmount,
          insurance_amount: totalAmount * 0.8,
          patient_amount: totalAmount * 0.2
        } : null
      };

      // Mettre à jour la consultation
      const { error: updateError } = await supabase
        .from('consultations')
        .update(updateData)
        .eq('id', consultation.id);

      if (updateError) throw updateError;

      setSuccess('Consultation finalisée avec succès');
      onStatusChange('completed');
    } catch (err) {
      console.error('Erreur lors de la finalisation:', err);
      setError('Une erreur est survenue lors de la finalisation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSign = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from('consultations')
        .update({ 
          status: 'signed',
          signed_at: new Date().toISOString(),
          signed_by: doctor.id,
          digital_signature: {
            doctor: doctor.name,
            timestamp: new Date().toISOString(),
            rpps: doctor.rppsCode
          }
        })
        .eq('id', consultation.id);

      if (updateError) throw updateError;

      setSuccess('Consultation signée avec succès');
      onStatusChange('signed');
    } catch (err) {
      console.error('Erreur lors de la signature:', err);
      setError('Une erreur est survenue lors de la signature');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const blob = await generatePatientReport(
        patient,
        doctor,
        {
          ...consultation,
          amount: consultation.amount || 25000
        },
        medications,
        examinations
      );

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport_medical_${patient.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess('Rapport généré avec succès');
    } catch (err) {
      console.error('Erreur lors de la génération du rapport:', err);
      setError('Une erreur est survenue lors de la génération du rapport');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransmitToInsurance = async () => {
    if (!patient.insurance_provider) {
      setError('Le patient n\'a pas d\'assurance');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Générer le PDF
      const reportBlob = await generatePatientReport(
        patient,
        doctor,
        {
          ...consultation,
          amount: consultation.amount || 25000
        },
        medications,
        examinations
      );

      // Transmettre à l'assurance
      const result = await transmitReportToInsurance(
        patient.insurance_provider as InsuranceProvider,
        reportBlob,
        patient.id,
        consultation.id
      );

      if (result.success) {
        const { error: updateError } = await supabase
          .from('consultations')
          .update({ 
            insurance_transmission: {
              status: 'transmitted',
              reference: result.reference,
              timestamp: result.timestamp,
              provider: patient.insurance_provider
            }
          })
          .eq('id', consultation.id);

        if (updateError) throw updateError;

        setSuccess('Rapport transmis à l\'assurance avec succès');
      }
    } catch (err) {
      console.error('Erreur lors de la transmission:', err);
      setError('Une erreur est survenue lors de la transmission à l\'assurance');
    } finally {
      setIsLoading(false);
    }
  };

  const renderActionButton = () => {
    const baseClasses = "flex items-center px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
    
    if (isLoading) {
      return (
        <button
          disabled
          className={`${baseClasses} bg-gray-100 text-gray-400 cursor-not-allowed`}
        >
          <Loader2 className="animate-spin h-5 w-5 mr-2" />
          Traitement en cours...
        </button>
      );
    }

    switch (consultation.status) {
      case 'in_progress':
        return (
          <button
            onClick={handleFinalize}
            className={`${baseClasses} bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500`}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Finaliser la consultation
          </button>
        );
      
      case 'completed':
        return (
          <button
            onClick={handleSign}
            className={`${baseClasses} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`}
          >
            <FileSignature className="h-5 w-5 mr-2" />
            Signer la consultation
          </button>
        );
      
      case 'signed':
        return (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleGenerateReport}
              className={`${baseClasses} bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500`}
            >
              <FileText className="h-5 w-5 mr-2" />
              Générer le rapport
            </button>
            
            {patient.insurance_provider && (
              <button
                onClick={handleTransmitToInsurance}
                className={`${baseClasses} bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500`}
              >
                <Send className="h-5 w-5 mr-2" />
                Transmettre à l'assurance
              </button>
            )}
          </div>
        );

      default:
        return (
          <button
            onClick={() => onStatusChange('in_progress')}
            className={`${baseClasses} bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500`}
          >
            <Edit className="h-5 w-5 mr-2" />
            Modifier
          </button>
        );
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-lg flex items-center">
          <CheckCircle className="h-5 w-5 text-emerald-500 mr-2" />
          <p className="text-emerald-700">{success}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {consultation.status === 'signed' && (
            <div className="flex items-center text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
              <Lock className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Consultation signée</span>
            </div>
          )}
        </div>
        {renderActionButton()}
      </div>
    </div>
  );
}