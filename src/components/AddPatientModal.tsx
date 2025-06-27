import React, { useState } from 'react';
import { 
  X, User, Calendar, CreditCard, Mail, Phone, Loader2, AlertCircle, 
  CheckCircle, Shield, MapPin, Building, FileText, AlertTriangle 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Patient } from '../types';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatientAdded: (patient: Patient) => void;
}

type InsuranceProvider = 'CNAMGS' | 'Ascoma' | 'Gras Savoye' | 'none';
type InsuranceType = 'insured' | 'dependent' | '';
type InsuranceStatus = 'active' | 'expired' | 'suspended' | '';

interface FormData {
  name: string;
  dateOfBirth: string;
  gender: 'M' | 'F' | '';
  nationality: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  insuranceProvider: InsuranceProvider;
  insuranceNumber: string;
  insuranceType: InsuranceType;
  insuranceStatus: InsuranceStatus;
  insuranceExpiryDate: string;
  medicalHistory: {
    allergies: string;
    chronicConditions: string;
    currentMedications: string;
    previousSurgeries: string;
  };
}

interface FormErrors {
  [key: string]: string;
}

export function AddPatientModal({ isOpen, onClose, onPatientAdded }: AddPatientModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    dateOfBirth: '',
    gender: '',
    nationality: '',
    address: '',
    city: '',
    postalCode: '',
    phone: '',
    email: '',
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    },
    insuranceProvider: 'none',
    insuranceNumber: '',
    insuranceType: '',
    insuranceStatus: '',
    insuranceExpiryDate: '',
    medicalHistory: {
      allergies: '',
      chronicConditions: '',
      currentMedications: '',
      previousSurgeries: ''
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [currentStep, setCurrentStep] = useState(1);

  if (!isOpen) return null;

  const validateForm = () => {
    const errors: FormErrors = {};
    
    // Validation étape 1 : Informations personnelles
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        errors.name = "Le nom du patient est requis";
      }
      
      if (!formData.dateOfBirth) {
        errors.dateOfBirth = "La date de naissance est requise";
      } else {
        const birthDate = new Date(formData.dateOfBirth);
        const today = new Date();
        if (birthDate > today) {
          errors.dateOfBirth = "La date de naissance ne peut pas être dans le futur";
        }
      }

      if (!formData.gender) {
        errors.gender = "Le genre est requis";
      }

      if (formData.phone && !/^[+]?[0-9\s-]{8,}$/.test(formData.phone)) {
        errors.phone = "Le format du numéro de téléphone est invalide";
      }

      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = "Le format de l'email est invalide";
      }
    }

    // Validation étape 2 : Contact d'urgence
    if (currentStep === 2) {
      if (formData.emergencyContact.name && !formData.emergencyContact.phone) {
        errors.emergencyContactPhone = "Le téléphone du contact d'urgence est requis";
      }
      
      if (formData.emergencyContact.phone && !/^[+]?[0-9\s-]{8,}$/.test(formData.emergencyContact.phone)) {
        errors.emergencyContactPhone = "Le format du numéro de téléphone est invalide";
      }
    }

    // Validation étape 3 : Assurance
    if (currentStep === 3) {
      if (formData.insuranceProvider !== 'none') {
        if (!formData.insuranceNumber) {
          errors.insuranceNumber = "Le numéro d'assurance est requis";
        }
        if (!formData.insuranceType) {
          errors.insuranceType = "Le type d'assurance est requis";
        }
        if (!formData.insuranceStatus) {
          errors.insuranceStatus = "Le statut de l'assurance est requis";
        }
        if (!formData.insuranceExpiryDate) {
          errors.insuranceExpiryDate = "La date d'expiration est requise";
        } else {
          const expiryDate = new Date(formData.insuranceExpiryDate);
          const today = new Date();
          if (expiryDate < today) {
            errors.insuranceExpiryDate = "La date d'expiration ne peut pas être dans le passé";
          }
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: newPatient, error: insertError } = await supabase
        .from('patients')
        .insert([{
          name: formData.name,
          date_of_birth: formData.dateOfBirth,
          gender: formData.gender,
          nationality: formData.nationality,
          address: formData.address,
          city: formData.city,
          postal_code: formData.postalCode,
          phone: formData.phone,
          email: formData.email,
          emergency_contact: formData.emergencyContact,
          insurance_provider: formData.insuranceProvider === 'none' ? null : formData.insuranceProvider,
          insurance_number: formData.insuranceProvider === 'none' ? null : formData.insuranceNumber,
          insurance_type: formData.insuranceProvider === 'none' ? null : formData.insuranceType,
          insurance_status: formData.insuranceProvider === 'none' ? null : formData.insuranceStatus,
          insurance_expiry: formData.insuranceProvider === 'none' ? null : formData.insuranceExpiryDate,
          medical_history: formData.medicalHistory,
          created_at: new Date().toISOString(),
          status: 'active'
        }])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      if (newPatient) {
        setSuccess(true);
        setTimeout(() => {
          onPatientAdded(newPatient as Patient);
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('Erreur lors de l\'ajout du patient:', err);
      setError('Une erreur est survenue lors de l\'ajout du patient');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Informations Personnelles";
      case 2:
        return "Contact d'Urgence";
      case 3:
        return "Informations d'Assurance";
      case 4:
        return "Antécédents Médicaux";
      default:
        return "";
    }
  };

  const renderStepIcon = () => {
    switch (currentStep) {
      case 1:
        return <User className="h-6 w-6 text-emerald-600" />;
      case 2:
        return <Phone className="h-6 w-6 text-emerald-600" />;
      case 3:
        return <Shield className="h-6 w-6 text-emerald-600" />;
      case 4:
        return <FileText className="h-6 w-6 text-emerald-600" />;
      default:
        return null;
    }
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Nom complet *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                required
              />
              {renderFieldError('name')}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date de naissance *
              </label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                required
              />
              {renderFieldError('dateOfBirth')}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Genre *
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'M' | 'F' | '' })}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                required
              >
                <option value="">Sélectionner</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
              {renderFieldError('gender')}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nationalité
              </label>
              <input
                type="text"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Adresse
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Ville
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Code postal
              </label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
              {renderFieldError('phone')}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
              {renderFieldError('email')}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nom du contact
              </label>
              <input
                type="text"
                value={formData.emergencyContact.name}
                onChange={(e) => setFormData({
                  ...formData,
                  emergencyContact: { ...formData.emergencyContact, name: e.target.value }
                })}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Lien de parenté
              </label>
              <input
                type="text"
                value={formData.emergencyContact.relationship}
                onChange={(e) => setFormData({
                  ...formData,
                  emergencyContact: { ...formData.emergencyContact, relationship: e.target.value }
                })}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Téléphone du contact
              </label>
              <input
                type="tel"
                value={formData.emergencyContact.phone}
                onChange={(e) => setFormData({
                  ...formData,
                  emergencyContact: { ...formData.emergencyContact, phone: e.target.value }
                })}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              />
              {renderFieldError('emergencyContactPhone')}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Assureur
              </label>
              <select
                value={formData.insuranceProvider}
                onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value as InsuranceProvider })}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option value="none">Pas d'assurance</option>
                <option value="CNAMGS">CNAMGS</option>
                <option value="Ascoma">Ascoma</option>
                <option value="Gras Savoye">Gras Savoye</option>
              </select>
            </div>

            {formData.insuranceProvider !== 'none' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Numéro d'assurance *
                  </label>
                  <input
                    type="text"
                    value={formData.insuranceNumber}
                    onChange={(e) => setFormData({ ...formData, insuranceNumber: e.target.value })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    required
                  />
                  {renderFieldError('insuranceNumber')}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Type d'assurance *
                  </label>
                  <select
                    value={formData.insuranceType}
                    onChange={(e) => setFormData({ ...formData, insuranceType: e.target.value as InsuranceType })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    required
                  >
                    <option value="">Sélectionner</option>
                    <option value="insured">Assuré principal</option>
                    <option value="dependent">Ayant droit</option>
                  </select>
                  {renderFieldError('insuranceType')}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Statut de l'assurance *
                  </label>
                  <select
                    value={formData.insuranceStatus}
                    onChange={(e) => setFormData({ ...formData, insuranceStatus: e.target.value as InsuranceStatus })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    required
                  >
                    <option value="">Sélectionner</option>
                    <option value="active">Actif</option>
                    <option value="expired">Expiré</option>
                    <option value="suspended">Suspendu</option>
                  </select>
                  {renderFieldError('insuranceStatus')}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Date d'expiration *
                  </label>
                  <input
                    type="date"
                    value={formData.insuranceExpiryDate}
                    onChange={(e) => setFormData({ ...formData, insuranceExpiryDate: e.target.value })}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                    required
                  />
                  {renderFieldError('insuranceExpiryDate')}
                </div>
              </>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Allergies
              </label>
              <textarea
                value={formData.medicalHistory.allergies}
                onChange={(e) => setFormData({
                  ...formData,
                  medicalHistory: { ...formData.medicalHistory, allergies: e.target.value }
                })}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Maladies chroniques
              </label>
              <textarea
                value={formData.medicalHistory.chronicConditions}
                onChange={(e) => setFormData({
                  ...formData,
                  medicalHistory: { ...formData.medicalHistory, chronicConditions: e.target.value }
                })}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Médicaments actuels
              </label>
              <textarea
                value={formData.medicalHistory.currentMedications}
                onChange={(e) => setFormData({
                  ...formData,
                  medicalHistory: { ...formData.medicalHistory, currentMedications: e.target.value }
                })}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Antécédents chirurgicaux
              </label>
              <textarea
                value={formData.medicalHistory.previousSurgeries}
                onChange={(e) => setFormData({
                  ...formData,
                  medicalHistory: { ...formData.medicalHistory, previousSurgeries: e.target.value }
                })}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                rows={3}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 my-8">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {renderStepIcon()}
              <h3 className="text-xl font-semibold text-gray-900 ml-3">
                {renderStepTitle()}
              </h3>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Indicateur de progression */}
          <div className="mt-4 flex items-center space-x-2">
            {[1, 2, 3, 4].map((step) => (
              <React.Fragment key={step}>
                <div
                  className={`h-2 flex-1 rounded-full ${
                    step <= currentStep
                      ? 'bg-emerald-600'
                      : 'bg-gray-200'
                  }`}
                />
                {step < 4 && (
                  <div className="w-2 h-2 rounded-full bg-gray-200" />
                )}
              </React.Fragment>
            ))}
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
              <p className="text-emerald-700">Patient ajouté avec succès</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {renderStepContent()}

            <div className="mt-8 flex justify-between">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Précédent
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading || success}
                className="ml-auto px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-3" />
                    Enregistrement...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle className="h-5 w-5 mr-3" />
                    Patient ajouté
                  </>
                ) : currentStep < 4 ? (
                  'Suivant'
                ) : (
                  'Enregistrer le patient'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}