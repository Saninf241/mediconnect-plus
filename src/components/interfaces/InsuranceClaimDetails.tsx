import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  FileText, Search, Calendar, Clock, Building, User, RefreshCw, Download,
  AlertCircle, CheckCircle, AlertTriangle, DollarSign, X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-toastify';

export function InsuranceClaimDetails() {
  const { id } = useParams();
  const [consultation, setConsultation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [commission, setCommission] = useState<number>(0);

  useEffect(() => {
    if (!id) return;
    fetchConsultationDetails();
  }, [id]);

  const fetchConsultationDetails = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('consultations')
        .select(`
          *,
          patients (
            name,
            insurance_number,
            insurance_provider
          ),
          clinic_staff (
            name,
            speciality
          ),
          clinics (
            name,
            code
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        setConsultation(data);
        const amount = data.insurance_coverage?.insurance_amount || 0;
        const calculatedCommission = Math.ceil(amount * 0.03);
        setCommission(calculatedCommission);
      }
    } catch (err) {
      console.error('Error fetching consultation:', err);
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async (status: "accepted" | "rejected") => {
    try {
      const { error: updateError } = await supabase
        .from('consultations')
        .update({ 
          status,
          rejection_reason: status === "rejected" ? rejectionReason : null,
          validated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success(status === "accepted" ? 
        "Consultation validée avec succès" : 
        "Consultation rejetée avec succès"
      );
      
      fetchConsultationDetails();
      setShowDialog(false);
      setRejectionReason("");
    } catch (err) {
      console.error('Error validating consultation:', err);
      toast.error("Une erreur est survenue lors de la validation");
    }
  };

  const handlePayment = async () => {
    if (!consultation) return;
    
    try {
      const { error: paymentError } = await supabase
        .from('consultations')
        .update({
          payment_status: 'paid',
          payment_date: new Date().toISOString(),
          payment_amount: consultation.insurance_coverage?.insurance_amount + commission
        })
        .eq('id', consultation.id);

      if (paymentError) throw paymentError;

      toast.success("Paiement effectué avec succès");
      fetchConsultationDetails();
    } catch (err) {
      console.error('Error processing payment:', err);
      toast.error("Une erreur est survenue lors du paiement");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
        <div className="flex">
          <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!consultation) {
    return (
      <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
        <div className="flex">
          <AlertTriangle className="h-6 w-6 text-yellow-500 mr-3" />
          <p className="text-yellow-700">Consultation non trouvée</p>
        </div>
      </div>
    );
  }

  const totalWithCommission = (consultation.insurance_coverage?.insurance_amount || 0) + commission;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dossier de remboursement</h1>

      <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations Patient</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Nom:</span> {consultation.patients?.name}</p>
              <p><span className="font-medium">N° Assuré:</span> {consultation.patients?.insurance_number}</p>
              <p><span className="font-medium">Assureur:</span> {consultation.patients?.insurance_provider}</p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations Consultation</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Date:</span> {new Date(consultation.created_at).toLocaleDateString()}</p>
              <p><span className="font-medium">Médecin:</span> {consultation.clinic_staff?.name}</p>
              <p><span className="font-medium">Spécialité:</span> {consultation.clinic_staff?.speciality}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Détails Financiers</h3>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <p><span className="font-medium">Montant total:</span> {consultation.insurance_coverage?.total_amount?.toLocaleString()} FCFA</p>
            <p><span className="font-medium">Part assurance:</span> {consultation.insurance_coverage?.insurance_amount?.toLocaleString()} FCFA</p>
            <p><span className="font-medium">Part patient:</span> {consultation.insurance_coverage?.patient_amount?.toLocaleString()} FCFA</p>
            <p className="text-sm text-gray-600">Commission plateforme (3%): {commission.toLocaleString()} FCFA</p>
            <p className="text-lg font-semibold text-emerald-700">Total à payer: {totalWithCommission.toLocaleString()} FCFA</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
          <div className="flex gap-4">
            <button
              onClick={() => handleValidation("accepted")}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <CheckCircle className="h-5 w-5 mr-2 inline-block" />
              Valider
            </button>
            <button
              onClick={() => setShowDialog(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <X className="h-5 w-5 mr-2 inline-block" />
              Rejeter
            </button>
            <button
              onClick={handlePayment}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <DollarSign className="h-5 w-5 mr-2 inline-block" />
              Effectuer le paiement
            </button>
          </div>
        </div>
      </div>

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Motif du rejet</h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full h-32 p-2 border border-gray-300 rounded-lg mb-4"
              placeholder="Saisissez le motif du rejet..."
            />
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Annuler
              </button>
              <button
                onClick={() => handleValidation("rejected")}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Confirmer le rejet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}