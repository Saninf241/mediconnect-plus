// src/pages/assureur/StatistiquesPage.tsx
import { useEffect, useState } from "react";
import { Card } from "../../components/ui/card";
import { supabase } from "../../lib/supabaseClient";

export default function StatistiquesPage() {
  const [stats, setStats] = useState({
    total: 0,
    amount: 0,
    pending: 0,
    completed: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase.from("consultations").select("*");

      if (error || !data) {
        console.error("Erreur récupération stats", error);
        return;
      }

      const total = data.length;
      const amount = data.reduce((sum, c) => sum + (c.amount || 0), 0);
      const pending = data.filter(c => c.status === "pending").length;
      const completed = data.filter(c => c.status === "completed").length;
      const rejected = data.filter(c => c.status === "rejected").length;

      setStats({ total, amount, pending, completed, rejected });
      setLoading(false);
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Statistiques Globales</h2>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <h4 className="font-semibold text-lg">Total Consultations</h4>
            <p>{stats.total}</p>
            <p className="text-sm text-gray-500">Montant global : {stats.amount.toLocaleString()} FCFA</p>
          </Card>
          <Card className="p-4">
            <h4 className="font-semibold text-lg">En attente</h4>
            <p>{stats.pending}</p>
          </Card>
          <Card className="p-4">
            <h4 className="font-semibold text-lg">Acceptées</h4>
            <p>{stats.completed}</p>
          </Card>
          <Card className="p-4">
            <h4 className="font-semibold text-lg">Rejetées</h4>
            <p>{stats.rejected}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
