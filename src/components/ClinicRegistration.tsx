import React, { useState } from 'react';
import { Building, Plus, Trash2, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StaffMember {
  name: string;
  role: 'doctor' | 'admin' | 'secretary';
  speciality?: string;
  licenseNumber?: string;
  email: string;
}

interface FormErrors {
  [key: string]: string;
}

export function ClinicRegistration() {
  const [formData, setFormData] = useState({
    name: '',
    type: 'clinic',
    code: '',
    address: '',
    siret: '',
    speciality: '',
    phone: '',
  });

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const validateForm = () => {
    const errors: FormErrors = {};
    
    if (!formData.name.trim()) {
      errors.name = "Le nom de l'établissement est requis";
    }
    
    if (!formData.code.trim()) {
      errors.code = "Le code établissement est requis";
    }
    
    if (!formData.address.trim()) {
      errors.address = "L'adresse est requise";
    }
    
    if (!formData.siret.trim()) {
      errors.siret = "Le numéro SIRET est requis";
    } else if (!/^\d{14}$/.test(formData.siret)) {
      errors.siret = "Le numéro SIRET doit contenir 14 chiffres";
    }

    if (staff.length === 0) {
      errors.staff = "Veuillez ajouter au moins un membre du personnel";
    }

    staff.forEach((member, index) => {
      if (!member.name.trim()) {
        errors[`staff.${index}.name`] = "Le nom est requis";
      }
      if (!member.email.trim()) {
        errors[`staff.${index}.email`] = "L'email est requis";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member.email)) {
        errors[`staff.${index}.email`] = "L'email n'est pas valide";
      }
      if (member.role === 'doctor' && !member.licenseNumber?.trim()) {
        errors[`staff.${index}.license`] = "Le numéro de licence est requis pour les médecins";
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddStaffMember = () => {
    setStaff([...staff, {
      name: '',
      role: 'doctor',
      speciality: '',
      licenseNumber: '',
      email: '',
    }]);
  };

  const handleRemoveStaffMember = (index: number) => {
    setStaff(staff.filter((_, i) => i !== index));
  };

  const handleStaffChange = (index: number, field: keyof StaffMember, value: string) => {
    const newStaff = [...staff];
    newStaff[index] = { ...newStaff[index], [field]: value };
    setStaff(newStaff);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError("Veuillez corriger les erreurs dans le formulaire");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Insérer la clinique
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .insert([{
          name: formData.name,
          type: formData.type,
          code: formData.code,
          address: formData.address,
          siret: formData.siret,
          speciality: formData.speciality,
          phone: formData.phone,
        }])
        .select()
        .single();

      if (clinicError) throw clinicError;

      // Insérer le personnel
      if (staff.length > 0) {
        const { error: staffError } = await supabase
          .from('clinic_staff')
          .insert(
            staff.map(member => ({
              clinic_id: clinicData.id,
              name: member.name,
              role: member.role,
              speciality: member.speciality,
              license_number: member.licenseNumber,
              email: member.email,
            }))
          );

        if (staffError) throw staffError;
      }

      setSuccess(true);
      // Réinitialiser le formulaire
      setFormData({
        name: '',
        type: 'clinic',
        code: '',
        address: '',
        siret: '',
        speciality: '',
        phone: '',
      });
      setStaff([]);
      setFormErrors({});
    } catch (err) {
      console.error('Erreur lors de l\'enregistrement:', err);
      setError('Une erreur est survenue lors de l\'enregistrement de la clinique');
    } finally {
      setIsLoading(false);
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-t-lg p-6 shadow-lg">
        <div className="flex items-center mb-4">
          <Building className="h-10 w-10 text-white mr-3" />
          <div>
            <h2 className="text-2xl font-bold text-white">Enregistrement d'Établissement</h2>
            <p className="text-indigo-100">Créez votre espace professionnel de santé</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-b-lg shadow-lg p-6 space-y-8">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-medium">Erreur</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-md flex items-start">
            <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
            <div>
              <h3 className="text-green-800 font-medium">Succès</h3>
              <p className="text-green-700">L'établissement a été enregistré avec succès !</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              Informations de l'Établissement
              <HelpCircle className="h-4 w-4 text-gray-400 ml-2" />
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'établissement *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full rounded-md shadow-sm ${
                    formErrors.name 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                />
                {renderFieldError('name')}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type d'établissement *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="clinic">Clinique</option>
                  <option value="specialist_office">Cabinet Spécialisé</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code établissement *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className={`w-full rounded-md shadow-sm ${
                    formErrors.code 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                />
                {renderFieldError('code')}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Numéro SIRET *
                </label>
                <input
                  type="text"
                  required
                  value={formData.siret}
                  pattern="[0-9]{14}"
                  title="Le numéro SIRET doit contenir 14 chiffres"
                  onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                  className={`w-full rounded-md shadow-sm ${
                    formErrors.siret 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                />
                {renderFieldError('siret')}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={`w-full rounded-md shadow-sm ${
                    formErrors.address 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`}
                />
                {renderFieldError('address')}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Spécialité médicale
                </label>
                <input
                  type="text"
                  value={formData.speciality}
                  onChange={(e) => setFormData({ ...formData, speciality: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  Personnel
                  <HelpCircle className="h-4 w-4 text-gray-400 ml-2" />
                </h3>
                <p className="text-sm text-gray-600">Ajoutez les membres de votre équipe</p>
              </div>
              <button
                type="button"
                onClick={handleAddStaffMember}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un membre
              </button>
            </div>

            {renderFieldError('staff')}

            <div className="space-y-4">
              {staff.map((member, index) => (
                <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-lg font-medium text-gray-900">
                      Membre du personnel #{index + 1}
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleRemoveStaffMember(index)}
                      className="text-red-600 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom complet *
                      </label>
                      <input
                        type="text"
                        required
                        value={member.name}
                        onChange={(e) => handleStaffChange(index, 'name', e.target.value)}
                        className={`w-full rounded-md shadow-sm ${
                          formErrors[`staff.${index}.name`]
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                        }`}
                      />
                      {renderFieldError(`staff.${index}.name`)}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rôle *
                      </label>
                      <select
                        value={member.role}
                        onChange={(e) => handleStaffChange(index, 'role', e.target.value as StaffMember['role'])}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      >
                        <option value="doctor">Médecin</option>
                        <option value="admin">Administrateur</option>
                        <option value="secretary">Secrétaire</option>
                      </select>
                    </div>

                    {member.role === 'doctor' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Spécialité
                          </label>
                          <input
                            type="text"
                            value={member.speciality || ''}
                            onChange={(e) => handleStaffChange(index, 'speciality', e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Numéro de licence *
                          </label>
                          <input
                            type="text"
                            value={member.licenseNumber || ''}
                            onChange={(e) => handleStaffChange(index, 'licenseNumber', e.target.value)}
                            className={`w-full rounded-md shadow-sm ${
                              formErrors[`staff.${index}.license`]
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                            }`}
                          />
                          {renderFieldError(`staff.${index}.license`)}
                        </div>
                      </>
                    )}

                    <div className={member.role === 'doctor' ? 'md:col-span-2' : ''}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={member.email}
                        onChange={(e) => handleStaffChange(index, 'email', e.target.value)}
                        className={`w-full rounded-md shadow-sm ${
                          formErrors[`staff.${index}.email`]
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                        }`}
                      />
                      {renderFieldError(`staff.${index}.email`)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enregistrement en cours...
                </span>
              ) : (
                "Enregistrer l'établissement"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}