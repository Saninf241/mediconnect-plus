import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { checkTransmissionStatus } from '../lib/insurance-api';
import type { InsuranceProvider } from '../lib/insurance-api';

interface TransmissionStatusProps {
  provider: InsuranceProvider;
  reference: string;
  onStatusChange?: (status: 'pending' | 'accepted' | 'rejected') => void;
}

export function InsuranceTransmissionStatus({ 
  provider, 
  reference,
  onStatusChange 
}: TransmissionStatusProps) {
  const [status, setStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending');
  const [message, setMessage] = useState<string | undefined>();
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const result = await checkTransmissionStatus(provider, reference);
      setStatus(result.status);
      setMessage(result.message);
      onStatusChange?.(result.status);
    } catch (error) {
      console.error('Erreur lors de la vérification du statut:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();
    // Vérifier le statut toutes les 30 secondes
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, [provider, reference]);

  return (
    <div className="p-4 rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {status === 'pending' && (
            <Clock className="h-5 w-5 text-yellow-500 mr-2" />
          )}
          {status === 'accepted' && (
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
          )}
          {status === 'rejected' && (
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          )}
          <div>
            <p className="font-medium">
              Transmission vers {provider}
              <span className="text-sm text-gray-500 ml-2">
                (Réf: {reference})
              </span>
            </p>
            {message && (
              <p className="text-sm text-gray-600 mt-1">{message}</p>
            )}
          </div>
        </div>
        <button
          onClick={checkStatus}
          disabled={isChecking}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        >
          <RefreshCw className={`h-5 w-5 ${isChecking ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}