import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Clock, FileText, AlertCircle, ChevronDown, ChevronUp,
  Stethoscope, Pill, TestTube, FileCheck, AlertTriangle, ClipboardList
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PatientHistoryProps {
  patientId: string;
  onClose: () => void;
}

interface ConsultationHistory {
  id: string;
  created_at: string;
  symptoms: string | null;
  diagnosis: string | null;
  notes: string | null;
  status: string;
  doctor: {
    name: string;
    speciality: string | null;
  };
  medications?: {
    name: string;
    dosage: string;
    form: string;
  }[];
  examinations?: {
    name: string;
    category: string;
    status: string;
    results?: string;
  }[];
}

export function PatientHistory({ patientId, onClose }: PatientHistoryProps) {
  const [consultations, setConsultations] = useState<ConsultationHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedConsultation, setExpandedConsultation] = useState<string | null>(null);

  useEffect(() => {
    const fetchConsultationHistory = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('consultations')
          .select(`
            id,
            created_at,
            symptoms,
            diagnosis,
            notes,
            status,
            clinic_staff (
              name,
              speciality
            ),
            consultation_medications (
              name,
              dosage,
              form
            ),
            consultation_examinations (
              name,
              category,
              status,
              results
            )
          `)
          .eq('patient_id', patientId)
          .order('created_at', { ascending: sortOrder === 'asc' });

        if (fetchError) throw fetchError;

        if (data) {
          setConsultations(data.map(consultation => ({
            ...consultation,
            doctor: consultation.clinic_staff,
            medications: consultation.consultation_medications,
            examinations: consultation.consultation_examinations
          })));
        }
      } catch (err) {
        console.error('Erreur lors du chargement de l\'historique:', err);
        setError('Une erreur est survenue lors du chargement de l\'historique');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConsultationHistory();
  }, [patientId, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const toggleConsultation = (consultationId: string) => {
    setExpandedConsultation(prev => prev === consultationId ? null : consultationId);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
        <div className="flex justify-center items-center min-h-[200px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <ClipboardList className="h-8 w-8 text-emerald-600 mr-3" />
          Historique des Consultations
        </h2>
        <div className="flex items-center space-x-6">
          <button
            onClick={toggleSortOrder}
            className="flex items-center px-4 py-2 text-lg font-medium text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            {sortOrder === 'desc' ? (
              <ChevronDown className="h-6 w-6 mr-2" />
            ) : (
              <ChevronUp className="h-6 w-6 mr-2" />
            )}
            {sortOrder === 'desc' ? 'Plus récent' : 'Plus ancien'}
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Fermer l'historique"
          >
            <X className="h-8 w-8" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-6 bg-red-50 border-l-4 border-red-500 rounded-xl flex items-center">
          <AlertCircle className="h-8 w-8 text-red-500 mr-4 flex-shrink-0" />
          <p className="text-red-700 text-lg">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {consultations.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-500">
              Aucune consultation enregistrée
            </p>
          </div>
        ) : (
          consultations.map((consultation) => (
            <div
              key={consultation.id}
              className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-emerald-200 transition-colors"
            >
              <button
                onClick={() => toggleConsultation(consultation.id)}
                className="w-full text-left p-6 bg-gray-50 hover:bg-emerald-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Stethoscope className="h-6 w-6 text-emerald-600 mr-3" />
                      <h3 className="text-xl font-semibold text-gray-900">
                        Dr. {consultation.doctor.name}
                        {consultation.doctor.speciality && (
                          <span className="text-gray-600 text-lg ml-2">
                            ({consultation.doctor.speciality})
                          </span>
                        )}
                      </h3>
                    </div>
                    <div className="flex items-center text-lg text-gray-600">
                      <Calendar className="h-5 w-5 mr-2" />
                      {new Date(consultation.created_at).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      <Clock className="h-5 w-5 ml-6 mr-2" />
                      {new Date(consultation.created_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-4 py-2 rounded-lg text-base font-medium ${
                    consultation.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : consultation.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    <FileCheck className={`h-5 w-5 mr-2 ${
                      consultation.status === 'completed'
                        ? 'text-green-600'
                        : consultation.status === 'cancelled'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                    }`} />
                    {consultation.status === 'completed'
                      ? 'Terminée'
                      : consultation.status === 'cancelled'
                      ? 'Annulée'
                      : 'En cours'}
                  </span>
                </div>

                {expandedConsultation !== consultation.id && consultation.diagnosis && (
                  <div className="mt-4 text-lg text-gray-600">
                    <strong className="font-medium">Diagnostic:</strong> {consultation.diagnosis}
                  </div>
                )}
              </button>

              {expandedConsultation === consultation.id && (
                <div className="p-6 border-t-2 border-gray-200 space-y-6">
                  {consultation.symptoms && (
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <AlertTriangle className="h-6 w-6 text-orange-500 mr-2" />
                        Symptômes
                      </h4>
                      <p className="text-lg text-gray-700 leading-relaxed">
                        {consultation.symptoms}
                      </p>
                    </div>
                  )}

                  {consultation.diagnosis && (
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <Stethoscope className="h-6 w-6 text-emerald-600 mr-2" />
                        Diagnostic
                      </h4>
                      <p className="text-lg text-gray-700 leading-relaxed">
                        {consultation.diagnosis}
                      </p>
                    </div>
                  )}

                  {consultation.medications && consultation.medications.length > 0 && (
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <Pill className="h-6 w-6 text-blue-600 mr-2" />
                        Médicaments prescrits
                      </h4>
                      <div className="space-y-3">
                        {consultation.medications.map((med, index) => (
                          <div 
                            key={index} 
                            className="flex items-center text-lg text-gray-700 bg-blue-50 p-3 rounded-lg"
                          >
                            <Pill className="h-5 w-5 text-blue-600 mr-3" />
                            <span className="font-medium">{med.name}</span>
                            <span className="mx-2">-</span>
                            <span>{med.dosage}</span>
                            <span className="mx-2">-</span>
                            <span className="text-gray-600">({med.form})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {consultation.examinations && consultation.examinations.length > 0 && (
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <TestTube className="h-6 w-6 text-purple-600 mr-2" />
                        Examens prescrits
                      </h4>
                      <div className="space-y-4">
                        {consultation.examinations.map((exam, index) => (
                          <div key={index} className="bg-purple-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center text-lg">
                                <FileText className="h-5 w-5 text-purple-600 mr-3" />
                                <span className="font-medium">{exam.name}</span>
                                <span className="text-gray-600 ml-2">({exam.category})</span>
                              </div>
                              <span className={`inline-flex items-center px-3 py-1 rounded-lg text-base font-medium ${
                                exam.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : exam.status === 'cancelled'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {exam.status}
                              </span>
                            </div>
                            {exam.results && (
                              <div className="mt-2 ml-8 text-lg text-gray-700">
                                <strong className="font-medium">Résultats:</strong> {exam.results}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {consultation.notes && (
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <FileText className="h-6 w-6 text-gray-600 mr-2" />
                        Notes complémentaires
                      </h4>
                      <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-line">
                        {consultation.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}