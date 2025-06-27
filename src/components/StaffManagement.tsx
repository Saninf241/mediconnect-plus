import React, { useState } from 'react';
import { 
  UserPlus, X, Building, Mail, Phone, Briefcase, 
  GraduationCap, AlertCircle, CheckCircle, Loader2, 
  FileText, User, Key, Calendar
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StaffMember {
  id: string;
  name: string;
  role: 'doctor' | 'admin' | 'secretary';
  speciality?: string;
  licenseNumber?: string;
  email: string;
  phone?: string;
  startDate: string;
  status: 'active' | 'inactive' | 'suspended';
  schedule?: {
    monday?: { start: string; end: string; };
    tuesday?: { start: string; end: string; };
    wednesday?: { start: string; end: string; };
    thursday?: { start: string; end: string; };
    friday?: { start: string; end: string; };
    saturday?: { start: string; end: string; };
  };
  qualifications?: string[];
}

interface FormErrors {
  [key: string]: string;
}

export function StaffManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: 'doctor' as 'doctor' | 'admin' | 'secretary',
    speciality: '',
    licenseNumber: '',
    email: '',
    phone: '',
    startDate: '',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    schedule: {
      monday: { start: '', end: '' },
      tuesday: { start: '', end: '' },
      wednesday: { start: '', end: '' },
      thursday: { start: '', end: '' },
      friday: { start: '', end: '' },
      saturday: { start: '', end: '' }
    },
    qualifications: [] as string[]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [newQualification, setNewQualification] = useState('');

  const validateForm = () => {
    const errors: FormErrors = {};

    if (!formData.name.trim()) {
      errors.name = "Le nom est requis";
    }

    if (!formData.email.trim()) {
      errors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "L'email n'est pas valide";
    }

    if (formData.role === 'doctor') {
      if (!formData.speciality.trim()) {
        errors.speciality = "La spécialité est requise pour un médecin";
      }
      if (!formData.licenseNumber?.trim()) {
        errors.licenseNumber = "Le numéro de licence est requis pour un médecin";
      }
    }

    if (formData.phone && !/^[+]?[0-9\s-]{8,}$/.test(formData.phone)) {
      errors.phone = "Le format du numéro de téléphone est invalide";
    }

    if (!formData.startDate) {
      errors.startDate = "La date de début est requise";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: newStaffMember, error: insertError } = await supabase
        .from('clinic_staff')
        .insert([{
          name: formData.name,
          role: formData.role,
          speciality: formData.speciality || null,
          license_number: formData.licenseNumber || null,
          email: formData.email,
          phone: formData.phone || null,
          start_date: formData.startDate,
          status: formData.status,
          schedule: Object.fromEntries(
            Object.entries(formData.schedule).filter(([_, value]) => value.start && value.end)
          ),
          qualifications: formData.qualifications,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setFormData({
          name: '',
          role: 'doctor',
          speciality: '',
          licenseNumber: '',
          email: '',
          phone: '',
          startDate: '',
          status: 'active',
          schedule: {
            monday: { start: '', end: '' },
            tuesday: { start: '', end: '' },
            wednesday: { start: '', end: '' },
            thursday: { start: '', end: '' },
            friday: { start: '', end: '' },
            saturday: { start: '', end: '' }
          },
          qualifications: []
        });
      }, 1500);
    } catch (err) {
      console.error('Erreur lors de l\'ajout du membre du personnel:', err);
      setError('Une erreur est survenue lors de l\'ajout du membre du personnel');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddQualification = () => {
    if (newQualification.trim()) {
      setFormData(prev => ({
        ...prev,
        qualifications: [...prev.qualifications, newQualification.trim()]
      }));
      setNewQualification('');
    }
  };

  const handleRemoveQualification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== index)
    }));
  };

  const renderFieldError = (fieldName: string) => {
    if (formErrors[fieldName]) {
      return (
        <p className="mt-1 text-sm text-red-600 flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {formErrors[fieldName]}
        </p>
      );
    }
    return null;
  };

  return (
    <div>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
      >
        <UserPlus className="h-5 w-5 mr-2" />
        Ajouter un membre du personnel
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 my-8">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 rounded-t-xl">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <UserPlus className="h-6 w-6 text-emerald-600 mr-3" />
                  <h3 className="text-xl font-semibold text-gray-900">
                    Ajouter un membre du personnel
                  </h3>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-md flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-md flex items-center">
                  <CheckCircle className="h-5 w-5 text-emerald-500 mr-3" />
                  <p className="text-emerald-700">Membre du personnel ajouté avec succès</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Informations de base */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <User className="h-5 w-5 text-emerald-600 mr-2" />
                    Informations Personnelles
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom complet *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                        required
                      />
                      {renderFieldError('name')}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rôle *
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as 'doctor' | 'admin' | 'secretary' })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                        required
                      >
                        <option value="doctor">Médecin</option>
                        <option value="admin">Administrateur</option>
                        <option value="secretary">Secrétaire</option>
                      </select>
                    </div>

                    {formData.role === 'doctor' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Spécialité *
                          </label>
                          <input
                            type="text"
                            value={formData.speciality}
                            onChange={(e) => setFormData({ ...formData, speciality: e.target.value })}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                            required
                          />
                          {renderFieldError('speciality')}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Numéro de licence *
                          </label>
                          <input
                            type="text"
                            value={formData.licenseNumber}
                            onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                            required
                          />
                          {renderFieldError('licenseNumber')}
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                        required
                      />
                      {renderFieldError('email')}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                      />
                      {renderFieldError('phone')}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date de début *
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                        required
                      />
                      {renderFieldError('startDate')}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Statut
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'suspended' })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                      >
                        <option value="active">Actif</option>
                        <option value="inactive">Inactif</option>
                        <option value="suspended">Suspendu</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Horaires */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <Calendar className="h-5 w-5 text-emerald-600 mr-2" />
                    Horaires de Travail
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(formData.schedule).map(([day, hours]) => (
                      <div key={day}>
                        <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                          {day}
                        </label>
                        <div className="flex space-x-4">
                          <div className="flex-1">
                            <input
                              type="time"
                              value={hours.start}
                              onChange={(e) => setFormData({
                                ...formData,
                                schedule: {
                                  ...formData.schedule,
                                  [day]: { ...hours, start: e.target.value }
                                }
                              })}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                            />
                          </div>
                          <div className="flex-1">
                            <input
                              type="time"
                              value={hours.end}
                              onChange={(e) => setFormData({
                                ...formData,
                                schedule: {
                                  ...formData.schedule,
                                  [day]: { ...hours, end: e.target.value }
                                }
                              })}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Qualifications */}
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <GraduationCap className="h-5 w-5 text-emerald-600 mr-2" />
                    Qualifications
                  </h4>

                  <div className="space-y-4">
                    <div className="flex space-x-4">
                      <input
                        type="text"
                        value={newQualification}
                        onChange={(e) => setNewQualification(e.target.value)}
                        placeholder="Ajouter une qualification..."
                        className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddQualification}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                      >
                        Ajouter
                      </button>
                    </div>

                    <div className="space-y-2">
                      {formData.qualifications.map((qual, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                        >
                          <span>{qual}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveQualification(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || success}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin h-5 w-5 mr-3" />
                        Enregistrement...
                      </>
                    ) : success ? (
                      <>
                        <CheckCircle className="h-5 w-5 mr-3" />
                        Enregistré
                      </>
                    ) : (
                      'Enregistrer'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}