import React, { useState, useEffect } from 'react';
import { Calendar, Users, FileText, Clock, Plus, Search, UserPlus, CalendarPlus, Building, AlertCircle, CheckCircle, X, BedDouble, Clock4, Filter, ChevronDown } from 'lucide-react';
import { AddPatientModal } from '../AddPatientModal';
import { PatientSearchModal } from '../PatientSearchModal';
import { supabase } from '../../lib/supabase';

interface Stats {
  appointments: number;
  patients: number;
  documentsToProcess: number;
  averageWaitTime: number;
}

interface FilterOptions {
  period: 'day' | 'week' | 'month';
  service?: string;
  doctor?: string;
}

interface Appointment {
  id: string;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  type: string;
  requires_hospitalization: boolean;
  duration: number;
  status: 'pending' | 'confirmed' | 'cancelled';
}

interface Doctor {
  id: string;
  name: string;
  speciality: string;
}

export function SecretaryInterface() {
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isAddAppointmentModalOpen, setIsAddAppointmentModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentType, setAppointmentType] = useState('consultation');
  const [requiresHospitalization, setRequiresHospitalization] = useState(false);
  const [hospitalizationDuration, setHospitalizationDuration] = useState(1);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    period: 'day'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<Stats>({
    appointments: 0,
    patients: 0,
    documentsToProcess: 0,
    averageWaitTime: 0
  });

  const getDateRange = (period: 'day' | 'week' | 'month') => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    switch (period) {
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      default: // day
        break;
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  const getPeriodLabel = (period: 'day' | 'week' | 'month') => {
    switch (period) {
      case 'day':
        return 'Aujourd\'hui';
      case 'week':
        return 'Cette semaine';
      case 'month':
        return 'Ce mois';
      default:
        return '';
    }
  };

  useEffect(() => {
    const fetchStats = async () => {
      const { start, end } = getDateRange(filterOptions.period);
      
      try {
        let query = supabase
          .from('appointments')
          .select('id, patient_id, doctor_id, scheduled_time, actual_start_time, service')
          .gte('date', start)
          .lte('date', end);

        if (filterOptions.service) {
          query = query.eq('service', filterOptions.service);
        }

        if (filterOptions.doctor) {
          query = query.eq('doctor_id', filterOptions.doctor);
        }

        const { data: appointments, error: appointmentsError } = await query;

        if (appointmentsError) throw appointmentsError;

        const uniquePatients = new Set(appointments?.map(a => a.patient_id));
        let totalWaitTime = 0;
        let waitCount = 0;

        appointments?.forEach(appointment => {
          if (appointment.scheduled_time && appointment.actual_start_time) {
            const scheduled = new Date(`${appointment.date}T${appointment.scheduled_time}`);
            const actual = new Date(`${appointment.date}T${appointment.actual_start_time}`);
            const waitTime = (actual.getTime() - scheduled.getTime()) / (1000 * 60);
            if (waitTime > 0) {
              totalWaitTime += waitTime;
              waitCount++;
            }
          }
        });

        const { count: pendingDocsCount } = await supabase
          .from('consultations')
          .select('id', { count: 'exact' })
          .is('medical_reports', null);

        setStats({
          appointments: appointments?.length || 0,
          patients: uniquePatients.size,
          documentsToProcess: pendingDocsCount || 0,
          averageWaitTime: waitCount > 0 ? Math.round(totalWaitTime / waitCount) : 0
        });

      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [filterOptions]);

  React.useEffect(() => {
    const fetchDoctors = async () => {
      const { data, error } = await supabase
        .from('clinic_staff')
        .select('id, name, speciality')
        .eq('role', 'doctor');

      if (error) {
        console.error('Erreur lors du chargement des médecins:', error);
        return;
      }

      if (data) {
        setDoctors(data);
      }
    };

    fetchDoctors();
  }, []);

  const handlePatientAdded = (patient: any) => {
    setSelectedPatient(patient);
    setIsAddPatientModalOpen(false);
    setIsAddAppointmentModalOpen(true);
  };

  const handlePatientSelected = (patient: any) => {
    setSelectedPatient(patient);
    setIsSearchModalOpen(false);
    setIsAddAppointmentModalOpen(true);
  };

  const handleAddAppointment = async () => {
    if (!selectedPatient || !selectedDoctor || !appointmentDate || !appointmentTime) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert([{
          patient_id: selectedPatient.id,
          doctor_id: selectedDoctor.id,
          date: appointmentDate,
          time: appointmentTime,
          type: appointmentType,
          requires_hospitalization: requiresHospitalization,
          hospitalization_duration: requiresHospitalization ? hospitalizationDuration : null,
          status: 'confirmed'
        }])
        .select();

      if (error) throw error;

      setSuccess('Rendez-vous ajouté avec succès');
      setIsAddAppointmentModalOpen(false);
      
      setSelectedPatient(null);
      setSelectedDoctor(null);
      setAppointmentDate('');
      setAppointmentTime('');
      setAppointmentType('consultation');
      setRequiresHospitalization(false);
      setHospitalizationDuration(1);
      
    } catch (err) {
      console.error('Erreur lors de l\'ajout du rendez-vous:', err);
      setError('Une erreur est survenue lors de l\'ajout du rendez-vous');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtres des statistiques
          </h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-gray-500 hover:text-gray-700"
          >
            <ChevronDown className={`h-5 w-5 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Période
              </label>
              <select
                value={filterOptions.period}
                onChange={(e) => setFilterOptions({
                  ...filterOptions,
                  period: e.target.value as 'day' | 'week' | 'month'
                })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option value="day">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service
              </label>
              <select
                value={filterOptions.service || ''}
                onChange={(e) => setFilterOptions({
                  ...filterOptions,
                  service: e.target.value || undefined
                })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option value="">Tous les services</option>
                <option value="consultation">Consultations</option>
                <option value="chirurgie">Chirurgie</option>
                <option value="radiologie">Radiologie</option>
                <option value="urgences">Urgences</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Médecin
              </label>
              <select
                value={filterOptions.doctor || ''}
                onChange={(e) => setFilterOptions({
                  ...filterOptions,
                  doctor: e.target.value || undefined
                })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option value="">Tous les médecins</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    Dr. {doctor.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Rendez-vous</h3>
            <Calendar className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-emerald-600">{stats.appointments}</p>
          <p className="text-sm text-gray-600">{getPeriodLabel(filterOptions.period)}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Patients</h3>
            <Users className="h-6 w-6 text-sky-600" />
          </div>
          <p className="text-3xl font-bold text-sky-600">{stats.patients}</p>
          <p className="text-sm text-gray-600">{getPeriodLabel(filterOptions.period)}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
            <FileText className="h-6 w-6 text-indigo-600" />
          </div>
          <p className="text-3xl font-bold text-indigo-600">{stats.documentsToProcess}</p>
          <p className="text-sm text-gray-600">À traiter</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Temps moyen</h3>
            <Clock className="h-6 w-6 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-600">{stats.averageWaitTime}m</p>
          <p className="text-sm text-gray-600">
            Attente {filterOptions.service ? `(${filterOptions.service})` : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setIsAddPatientModalOpen(true)}
          className="flex items-center justify-center p-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Nouveau Patient
        </button>

        <button
          onClick={() => setIsSearchModalOpen(true)}
          className="flex items-center justify-center p-4 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg hover:from-sky-600 hover:to-sky-700 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <Search className="h-5 w-5 mr-2" />
          Rechercher Patient
        </button>

        <button
          onClick={() => setIsAddAppointmentModalOpen(true)}
          className="flex items-center justify-center p-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-lg hover:from-indigo-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <CalendarPlus className="h-5 w-5 mr-2" />
          Nouveau Rendez-vous
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Rendez-vous du Jour</h3>
          <button className="text-emerald-600 hover:text-emerald-700">
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {appointments.length === 0 ? (
            <p className="text-center text-gray-500 py-4">Aucun rendez-vous aujourd'hui</p>
          ) : (
            appointments.map((appointment) => (
              <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{appointment.patientName}</p>
                  <p className="text-sm text-gray-600">Dr. {appointment.doctorName} - {appointment.type}</p>
                  {appointment.requires_hospitalization && (
                    <p className="text-sm text-indigo-600 flex items-center mt-1">
                      <BedDouble className="h-4 w-4 mr-1" />
                      Hospitalisation prévue
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium text-emerald-600">{appointment.time}</p>
                  <p className="text-sm text-gray-600">Salle 3</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AddPatientModal
        isOpen={isAddPatientModalOpen}
        onClose={() => setIsAddPatientModalOpen(false)}
        onPatientAdded={handlePatientAdded}
      />

      <PatientSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSelectPatient={handlePatientSelected}
      />

      {isAddAppointmentModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">Nouveau Rendez-vous</h3>
                <button 
                  onClick={() => setIsAddAppointmentModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Fermer</span>
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-md">
                  <div className="flex">
                    <CheckCircle className="h-5 w-5 text-emerald-500 mr-2" />
                    <p className="text-emerald-700">{success}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {selectedPatient && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">{selectedPatient.name}</p>
                    <p className="text-sm text-gray-600">
                      Né(e) le {new Date(selectedPatient.dateOfBirth).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Médecin
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <select
                      value={selectedDoctor?.id || ''}
                      onChange={(e) => {
                        const doctor = doctors.find(d => d.id === e.target.value);
                        setSelectedDoctor(doctor || null);
                      }}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    >
                      <option value="">Sélectionnez un médecin</option>
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          Dr. {doctor.name} - {doctor.speciality}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Heure
                    </label>
                    <input
                      type="time"
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type de rendez-vous
                  </label>
                  <select
                    value={appointmentType}
                    onChange={(e) => setAppointmentType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="consultation">Consultation</option>
                    <option value="suivi">Suivi</option>
                    <option value="urgence">Urgence</option>
                    <option value="chirurgie">Chirurgie</option>
                    <option value="examen">Examen</option>
                  </select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="requires-hospitalization"
                      checked={requiresHospitalization}
                      onChange={(e) => setRequiresHospitalization(e.target.checked)}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                    />
                    <label htmlFor="requires-hospitalization" className="ml-2 block text-sm text-gray-900">
                      Hospitalisation requise
                    </label>
                  </div>

                  {requiresHospitalization && (
                    <div className="pl-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Durée d'hospitalisation (en jours)
                      </label>
                      <div className="flex items-center">
                        <Clock4 className="h-5 w-5 text-gray-400 mr-2" />
                        <input
                          type="number"
                          min="1"
                          value={hospitalizationDuration}
                          onChange={(e) => setHospitalizationDuration(parseInt(e.target.value))}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-500">jours</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsAddAppointmentModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddAppointment}
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  Confirmer le rendez-vous
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}