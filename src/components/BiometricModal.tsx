import React, { useState } from 'react';
import { Fingerprint, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Patient } from '../types';

interface BiometricModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (userId: string, patientData?: Patient) => void;
  verificationStatus: 'pending' | 'scanning' | 'success' | 'failed';
}

// Liste des développeurs autorisés
const authorizedDevelopers = ['nkopierre3@gmail.com'];

export function BiometricModal({ isOpen, onClose, onVerified, verificationStatus }: BiometricModalProps) {
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const verifyBiometricAndFetchData = async () => {
    try {
      // Vérifier si c'est un développeur autorisé
      const userEmail = localStorage.getItem('userEmail');
      if (authorizedDevelopers.includes(userEmail || '')) {
        // Pour les développeurs, on bypass complètement la vérification biométrique
        onVerified('DEV-123', {
          id: 'TEST-PATIENT-ID',
          name: 'Patient Test',
          dateOfBirth: new Date().toISOString(),
          biometricId: 'BIO-TEST'
        });
        return;
      }

      // Pour les autres utilisateurs, on continue avec la vérification biométrique normale
      const biometricId = 'BIO-123'; // Dans un cas réel, ceci viendrait du lecteur d'empreintes

      const { data: patient, error: fetchError } = await supabase
        .from('patients')
        .select('*')
        .eq('biometric_id', biometricId)
        .single();

      if (fetchError) {
        throw new Error('Erreur lors de la recherche du patient');
      }

      if (patient) {
        onVerified('DOCTOR-123', patient);
      } else {
        setError("Aucun patient trouvé avec cette empreinte. Veuillez procéder à l'enregistrement manuel.");
        setTimeout(() => {
          onVerified('DOCTOR-123', undefined);
        }, 2000);
      }
    } catch (err) {
      setError('Erreur lors de la vérification biométrique');
      console.error('Erreur biométrique:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Vérification Biométrique</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {verificationStatus === 'pending' && (
          <>
            <Fingerprint className="h-16 w-16 text-emerald-600 mb-4" />
            <p className="text-gray-600 text-center mb-4">
              Placez votre doigt sur le lecteur d'empreintes pour vous identifier
            </p>
            {error && (
              <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
            )}
            <button
              onClick={verifyBiometricAndFetchData}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Commencer la Vérification
            </button>
            <button
  onClick={async () => {
    const userEmail = localStorage.getItem('userEmail');

    const { data: staffData, error: fetchError } = await supabase
      .from('clinic_staff')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (fetchError || !staffData?.id) {
      setError("Impossible d’activer le mode temporaire.");
      return;
    }

    const validUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h

    const { error: updateError } = await supabase
      .from('clinic_staff')
      .update({ bypass_biometry_until: validUntil.toISOString() })
      .eq('id', staffData.id);

    if (updateError) {
      setError("Erreur pendant l’activation temporaire.");
    } else {
      onVerified('DOCTOR-123'); // déverrouille l’accès comme si l’empreinte était validée
    }
  }}
  className="mt-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
>
  Problème d'appareil ? Accès temporaire sécurisé
</button>

          </>
        )}

        {verificationStatus === 'scanning' && (
          <>
            <Loader2 className="h-16 w-16 text-emerald-600 mb-4 animate-spin" />
            <p className="text-gray-600">Vérification en cours...</p>
          </>
        )}

        {verificationStatus === 'success' && (
          <>
            <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <Fingerprint className="h-10 w-10 text-emerald-600" />
            </div>
            <p className="text-emerald-600 font-medium">Identité vérifiée</p>
          </>
        )}

        {verificationStatus === 'failed' && (
          <>
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Fingerprint className="h-10 w-10 text-red-600" />
            </div>
            <p className="text-red-600 font-medium">Échec de la vérification</p>
            {error && (
              <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
            )}
            <button
              onClick={verifyBiometricAndFetchData}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Réessayer
            </button>
          </>
        )}
      </div>
    </div>
  );
}