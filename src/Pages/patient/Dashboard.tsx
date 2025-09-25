// /src/Pages/patient/Dashboard.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function PatientDashboard() {
  const [stats, setStats] = useState({
    consultations: 0,
    traitements: 0,
    ordonnances: 0,
    rdvAvenir: 0,
  });

  const [lastOrdonnance, setLastOrdonnance] = useState<string | null>(null);
  const [nextRdv, setNextRdv] = useState<string | null>(null);

  // TODO: Remplacer ces fetchs par vos vraies requêtes Supabase
  useEffect(() => {
    // Données fictives
    setStats({
      consultations: 12,
      traitements: 3,
      ordonnances: 5,
      rdvAvenir: 2,
    });

    setLastOrdonnance("Paracétamol 500mg - 2x/jour pendant 5 jours");
    setNextRdv("25 juillet 2025 à 10h - Dr. Mavoungou (ORL)");
  }, []);

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">👤 Tableau de bord patient</h1>

      {/* Résumé chiffré */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-100 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-700">{stats.consultations}</div>
          <div className="text-sm text-gray-600">Consultations</div>
        </div>
        <div className="bg-green-100 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-700">{stats.traitements}</div>
          <div className="text-sm text-gray-600">Traitements en cours</div>
        </div>
        <div className="bg-purple-100 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-purple-700">{stats.ordonnances}</div>
          <div className="text-sm text-gray-600">Ordonnances émises</div>
        </div>
        <div className="bg-yellow-100 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-yellow-700">{stats.rdvAvenir}</div>
          <div className="text-sm text-gray-600">Rendez-vous à venir</div>
        </div>
      </div>

      {/* Derniers éléments */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-4 shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">📄 Dernière ordonnance</h2>
          {lastOrdonnance ? (
            <p className="text-gray-700">{lastOrdonnance}</p>
          ) : (
            <p className="text-gray-400">Aucune ordonnance récente</p>
          )}
          <Link
            to="/patient/Ordonnances"
            className="text-blue-600 text-sm mt-2 inline-block underline"
          >
            Voir toutes les ordonnances →
          </Link>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">📅 Prochain rendez-vous</h2>
          {nextRdv ? (
            <p className="text-gray-700">{nextRdv}</p>
          ) : (
            <p className="text-gray-400">Aucun rendez-vous prévu</p>
          )}
          <Link
            to="/patient/Rendezvous"
            className="text-blue-600 text-sm mt-2 inline-block underline"
          >
            Voir tous les rendez-vous →
          </Link>
        </div>
      </div>
    </div>
  );
}

