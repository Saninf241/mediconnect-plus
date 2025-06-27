// src/components/ui/uidoctor/SearchPatient.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AddPatientModal from './AddPatientModal';

interface Patient {
  id: string;
  name: string;
  date_of_birth: string;
  insurance_number?: string;
}

export default function SearchPatient() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (query.trim()) {
        searchPatients();
      } else {
        setResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const searchPatients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .ilike('name', `%${query}%`);

    if (error) {
      console.error('Erreur recherche patient :', error);
    } else {
      setResults(data);
      // Si aucune correspondance, ouvrir le modal automatiquement
      if (data.length === 0 && query.trim().length > 2) {
        setShowModal(true);
      }
    }
    setLoading(false);
  };

  const handlePatientCreated = () => {
    setShowModal(false);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Rechercher un patient</h2>

      <input
        type="text"
        placeholder="Nom du patient..."
        className="w-full border rounded px-4 py-2"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading ? (
        <p className="text-gray-500 mt-2">Recherche en cours...</p>
      ) : (
        <div className="mt-4">
          {results.length > 0 ? (
            <ul className="space-y-2">
              {results.map((p) => (
                <li key={p.id} className="p-2 bg-white shadow rounded">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-gray-600">Né(e) le {new Date(p.date_of_birth).toLocaleDateString()}</p>
                </li>
              ))}
            </ul>
          ) : (
            query.trim().length > 2 && (
              <p className="text-gray-600 mt-4">Aucun patient trouvé. Ouverture du formulaire...</p>
            )
          )}
        </div>
      )}

      {showModal && (
        <AddPatientModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onPatientCreated={handlePatientCreated}
        />
      )}
    </div>
  );
}
