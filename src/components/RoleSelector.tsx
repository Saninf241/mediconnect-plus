import React, { useState, useEffect } from 'react';
import { Building, UserCog } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Clinic } from '../types';

interface RoleSelectorProps {
  userEmail: string;
  onSelect: (role: string, clinicId: string) => void;
}

export function RoleSelector({ userEmail, onSelect }: RoleSelectorProps) {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedClinic, setSelectedClinic] = useState<string>('');

  useEffect(() => {
    const fetchClinics = async () => {
      if (!selectedRole) return;

      // On suppose que assureur = type 'assureur', sinon = type 'clinic'
      const clinicType = selectedRole === 'assurer' ? 'assureur' : 'specialist_office';
      const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('type', clinicType);

      if (data && !error) {
        const sortedClinics = [...data].sort((a, b) => a.name.localeCompare(b.name));
        setClinics(sortedClinics);
      } else {
        setClinics([]);
      }
    };

    fetchClinics();
  }, [selectedRole]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole && selectedClinic) {
      onSelect(selectedRole, selectedClinic);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="text-center mb-6">
        <UserCog className="h-12 w-12 text-emerald-600 mx-auto mb-2" />
        <h2 className="text-2xl font-bold text-gray-900">Sélection du Rôle</h2>
        <p className="text-gray-600">Choisissez votre rôle et établissement</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Sélection du rôle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setSelectedClinic('');
            }}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            required
          >
            <option value="">Sélectionnez un rôle</option>
            <option value="doctor">Médecin</option>
            <option value="secretary">Secrétaire</option>
            <option value="admin">Administrateur</option>
            <option value="assurer">Assureur</option>
          </select>
        </div>

        {/* Sélection de l’établissement */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Établissement</label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <select
              value={selectedClinic}
              onChange={(e) => setSelectedClinic(e.target.value)}
              className="w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              required
            >
              <option value="">Sélectionnez un établissement</option>
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name ?? clinic.nom}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bouton valider */}
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
          disabled={!selectedRole || !selectedClinic}
        >
          Accéder à l’interface
        </button>
      </form>
    </div>
  );
}
