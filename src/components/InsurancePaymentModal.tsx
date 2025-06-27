import React, { useState } from 'react';
import { 
  DollarSign, Building, Calendar, CreditCard, 
  Calculator, CheckCircle, AlertCircle, Loader2,
  FileText, ArrowRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinicReports: {
    clinicId: string;
    clinicName: string;
    amount: number;
    reportsCount: number;
  }[];
  totalAmount: number;
}

interface PaymentInfo {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
}

export function InsurancePaymentModal({ 
  isOpen, 
  onClose, 
  clinicReports,
  totalAmount 
}: PaymentModalProps) {
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen) return null;

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Simulation du traitement du paiement
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulation de la répartition des paiements
      for (const report of clinicReports) {
        await supabase
          .from('clinic_payments')
          .insert({
            clinic_id: report.clinicId,
            amount: report.amount,
            payment_date: new Date().toISOString(),
            status: 'completed',
            reports_count: report.reportsCount
          });
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Erreur lors du paiement:', err);
      setError('Une erreur est survenue lors du traitement du paiement');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <DollarSign className="h-8 w-8 text-emerald-600 mr-3" />
            Paiement Global
          </h2>
          <p className="mt-2 text-gray-600">
            Règlement des consultations pour les établissements de santé
          </p>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-center">
              <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-lg flex items-center">
              <CheckCircle className="h-6 w-6 text-emerald-500 mr-3" />
              <p className="text-emerald-700">Paiement effectué avec succès</p>
            </div>
          )}

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calculator className="h-6 w-6 text-emerald-600 mr-2" />
                Récapitulatif
              </h3>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
              >
                {showDetails ? 'Masquer' : 'Voir'} le détail
              </button>
            </div>

            {showDetails && (
              <div className="space-y-3 mb-4">
                {clinicReports.map((report, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <Building className="h-5 w-5 text-gray-500 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{report.clinicName}</p>
                        <p className="text-sm text-gray-500">
                          {report.reportsCount} consultation{report.reportsCount > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(report.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border-2 border-emerald-200">
              <div>
                <p className="text-sm font-medium text-emerald-700">Montant total</p>
                <p className="text-2xl font-bold text-emerald-900">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
              <ArrowRight className="h-6 w-6 text-emerald-600" />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom sur la carte
              </label>
              <input
                type="text"
                value={paymentInfo.cardholderName}
                onChange={(e) => setPaymentInfo({ 
                  ...paymentInfo, 
                  cardholderName: e.target.value 
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="JEAN DUPONT"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de carte
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={paymentInfo.cardNumber}
                  onChange={(e) => setPaymentInfo({ 
                    ...paymentInfo, 
                    cardNumber: formatCardNumber(e.target.value) 
                  })}
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                  required
                />
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date d'expiration
                </label>
                <input
                  type="text"
                  value={paymentInfo.expiryDate}
                  onChange={(e) => setPaymentInfo({ 
                    ...paymentInfo, 
                    expiryDate: formatExpiryDate(e.target.value) 
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="MM/YY"
                  maxLength={5}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CVV
                </label>
                <input
                  type="text"
                  value={paymentInfo.cvv}
                  onChange={(e) => setPaymentInfo({ 
                    ...paymentInfo, 
                    cvv: e.target.value.replace(/\D/g, '').slice(0, 3) 
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="123"
                  maxLength={3}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isLoading || success}
                className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Traitement en cours...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Payé
                  </>
                ) : (
                  <>
                    <DollarSign className="h-5 w-5 mr-2" />
                    Payer {formatCurrency(totalAmount)}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}