import React, { useState } from 'react';
import { Search, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Patient } from '../types';

interface PatientSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPatient: (patient: Patient) => void;
}

export function PatientSearchModal({ isOpen, onClose, onSelectPatient }: PatientSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: patients, error: searchError } = await supabase
        .from('patients')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,insurance_number.ilike.%${searchTerm}%`);

      if (searchError) {
        throw searchError;
      }

      setSearchResults(patients || []);
    } catch (err) {
      console.error('Erreur de recherche:', err);
      setError('Une erreur est survenue lors de la recherche');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Rechercher un Patient</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nom du patient ou numéro d'assurance..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            </div>
            <button
              type="submit"
              disabled={isLoading || !searchTerm.trim()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </form>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Recherche en cours...</p>
            </div>
          ) : searchResults.length === 0 ? (
            searchTerm && (
              <p className="text-center text-gray-500 py-4">
                Aucun patient trouvé pour "{searchTerm}"
              </p>
            )
          ) : (
            searchResults.map((patient) => (
              <button
                key={patient.id}
                onClick={() => onSelectPatient(patient)}
                className="w-full text-left p-4 rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-emerald-200 transition-colors"
              >
                <p className="font-medium text-gray-900">{patient.name}</p>
                <div className="mt-1 space-y-1">
                  <p className="text-sm text-gray-600">
                    Né(e) le {new Date(patient.dateOfBirth).toLocaleDateString()}
                  </p>
                  {patient.insuranceNumber && (
                    <p className="text-sm text-emerald-600 font-medium">
                      N° Assurance: {patient.insuranceNumber}
                    </p>
                  )}
                  {patient.phone && (
                    <p className="text-sm text-gray-600">
                      Tél: {patient.phone}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}