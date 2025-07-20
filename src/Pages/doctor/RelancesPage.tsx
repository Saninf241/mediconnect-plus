// src/pages/doctor/RelancesPage.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface Consultation {
  id: string;
  created_at: string;
  amount: number;
  rejection_reason?: string;
}

export default function RelancesPage() {
  const [rejected, setRejected] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRejected = async () => {
    setLoading(true);
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from('consultations')
      .select('id, created_at, amount, rejection_reason')
      .eq('doctor_id', userId)
      .eq('status', 'rejected')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRejected(data);
    }
    setLoading(false);
  };

  const handleRelaunch = async (id: string) => {
    const { error } = await supabase
      .from('consultations')
      .update({ status: 'pending', rejection_reason: null })
      .eq('id', id);

    if (!error) {
      fetchRejected();
    }
  };

  useEffect(() => {
    fetchRejected();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Relancer un dossier rejeté</h1>

      {loading ? (
        <p>Chargement...</p>
      ) : rejected.length === 0 ? (
        <p className="text-gray-500">Aucune consultation rejetée à relancer.</p>
      ) : (
        <ul className="space-y-4">
          {rejected.map((c) => (
            <li key={c.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
              <div>
                <p><strong>Date :</strong> {new Date(c.created_at).toLocaleDateString()}</p>
                <p><strong>Montant :</strong> {c.amount} FCFA</p>
                <p className="text-red-500"><strong>Motif du rejet :</strong> {c.rejection_reason || 'Non spécifié'}</p>
              </div>
              <button
                onClick={() => handleRelaunch(c.id)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Relancer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
