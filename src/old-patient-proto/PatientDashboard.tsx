import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Calendar, FileText, Clock, User, Phone, Mail, 
  MapPin, Shield, AlertCircle, LogOut
} from 'lucide-react';

interface PatientDashboardProps {
  patientId: string;
  onLogout: () => void;
}

interface Consultation {
  id: string;
  date: string;
  doctor: string;
  type: string;
  status: string;
}

interface PatientProfile {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  insuranceNumber?: string;
  dateOfBirth: string;
}

export function PatientDashboard({ patientId, onLogout }: PatientDashboardProps) {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        // Fetch patient profile
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('*')
          .eq('id', patientId)
          .single();

        if (patientError) throw patientError;

        if (patientData) {
          setProfile({
            name: patientData.name,
            email: patientData.email || '',
            phone: patientData.phone,
            address: patientData.address,
            insuranceNumber: patientData.insurance_number,
            dateOfBirth: patientData.date_of_birth
          });
        }

        // Fetch consultations
        const { data: consultationsData, error: consultationsError } = await supabase
          .from('consultations')
          .select(`
            id,
            created_at,
            status,
            consultation_type,
            clinic_staff (name)
          `)
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false });

        if (consultationsError) throw consultationsError;

        if (consultationsData) {
          setConsultations(consultationsData.map(c => ({
            id: c.id,
            date: new Date(c.created_at).toLocaleDateString(),
            doctor: c.clinic_staff?.name || 'Non assigné',
            type: c.consultation_type || 'Consultation standard',
            status: c.status
          })));
        }
      } catch (err) {
        console.error('Erreur lors du chargement des données:', err);
        setError('Une erreur est survenue lors du chargement de vos données');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatientData();
  }, [patientId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Espace Patient</h1>
            <button
              onClick={onLogout}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Profile Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-emerald-600" />
                Informations Personnelles
              </h2>
              <div className="space-y-3">
                <p className="flex items-center text-gray-600">
                  <User className="h-4 w-4 mr-2" />
                  {profile?.name}
                </p>
                <p className="flex items-center text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  Né(e) le {new Date(profile?.dateOfBirth || '').toLocaleDateString()}
                </p>
                {profile?.email && (
                  <p className="flex items-center text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    {profile.email}
                  </p>
                )}
                {profile?.phone && (
                  <p className="flex items-center text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    {profile.phone}
                  </p>
                )}
                {profile?.address && (
                  <p className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {profile.address}
                  </p>
                )}
                {profile?.insuranceNumber && (
                  <p className="flex items-center text-gray-600">
                    <Shield className="h-4 w-4 mr-2" />
                    N° Assurance: {profile.insuranceNumber}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Consultations Card */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-emerald-600" />
                Historique des Consultations
              </h2>
              <div className="space-y-4">
                {consultations.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    Aucune consultation enregistrée
                  </p>
                ) : (
                  consultations.map((consultation) => (
                    <div
                      key={consultation.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            Dr. {consultation.doctor}
                          </p>
                          <p className="text-sm text-gray-500">
                            {consultation.type}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {consultation.date}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            consultation.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : consultation.status === 'cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {consultation.status === 'completed'
                              ? 'Terminée'
                              : consultation.status === 'cancelled'
                              ? 'Annulée'
                              : 'En cours'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}