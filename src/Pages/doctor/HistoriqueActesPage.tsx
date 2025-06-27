// src/pages/doctor/HistoriqueActesPage.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Consultation {
  id: string;
  created_at: string;
  amount: number;
  status: string;
  patient_name: string;
}

export default function HistoriqueActesPage() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [filtered, setFiltered] = useState<Consultation[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    const fetchConsultations = async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { data, error } = await supabase
        .from('consultations')
        .select('id, created_at, amount, status, patients(name)')
        .eq('doctor_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formatted = data.map(c => ({
          id: c.id,
          created_at: c.created_at,
          amount: c.amount,
          status: c.status,
          patient_name: c.patients?.name || '—'
        }));
        setConsultations(formatted);
        setFiltered(formatted);
      }
    };
    fetchConsultations();
  }, []);

  const handleFilter = () => {
    let result = consultations;

    if (search) {
      result = result.filter(c => c.patient_name.toLowerCase().includes(search.toLowerCase()));
    }
    if (status) {
      result = result.filter(c => c.status === status);
    }
    if (startDate) {
      result = result.filter(c => new Date(c.created_at) >= new Date(startDate));
    }
    if (endDate) {
      result = result.filter(c => new Date(c.created_at) <= new Date(endDate));
    }
    setFiltered(result);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Historique des actes</h1>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <input
          type="text"
          placeholder="🔍 Nom du patient"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="border p-2 rounded">
          <option value="">Tous statuts</option>
          <option value="pending">En attente</option>
          <option value="accepted">Accepté</option>
          <option value="rejected">Rejeté</option>
        </select>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border p-2 rounded"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border p-2 rounded"
        />
        <button
          onClick={handleFilter}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Rechercher
        </button>
      </div>

      <div className="overflow-x-auto mt-4">
        <table className="min-w-full border bg-white">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Patient</th>
              <th className="p-3 text-left">Montant</th>
              <th className="p-3 text-left">Statut</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t text-sm">
                <td className="p-3">{new Date(c.created_at).toLocaleDateString()}</td>
                <td className="p-3">{c.patient_name}</td>
                <td className="p-3">{c.amount.toLocaleString()} FCFA</td>
                <td className="p-3 capitalize">{c.status}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">Aucune consultation trouvée.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
