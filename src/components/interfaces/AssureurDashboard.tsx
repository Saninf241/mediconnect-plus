import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, Building, Calendar, Clock, FileText, 
  DollarSign, TrendingUp, TrendingDown, Users, 
  RefreshCw, ChevronDown, Filter, Download,
  Calendar, Clock, Building, User, Key, Calendar,
  PlusCircle, X, Pill, TestTube, History, ChevronDown,
  ChevronUp, FileCheck, AlertTriangle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export function AssureurDashboard() {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalClaims: 0,
    pendingClaims: 0,
    totalAmount: 0,
    averageProcessingTime: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState('month');

  useEffect(() => {
    fetchStats();
  }, [filterPeriod]);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('*');

      if (error) throw error;

      setStats({
        totalClaims: data?.length || 0,
        pendingClaims: data?.filter(c => c.status === 'pending').length || 0,
        totalAmount: data?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0,
        averageProcessingTime: 2.5 // Placeholder
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setIsLoading(false);
    }
  };

  const runAnomalyDetection = async () => {
    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const res = await fetch("https://zwxegqevthzfphdqtjew.supabase.co/functions/v1/detect-anomalies");
      const data = await res.json();

      if (res.ok) {
        toast.success(`${data.count} dérive(s) détectée(s).`);
      } else {
        toast.error("Erreur : " + data.error);
      }
    } catch (err) {
      toast.error("Échec de la détection.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateBatch = async () => {
    try {
      const res = await fetch("https://zwxegqevthzfphdqtjew.supabase.co/functions/v1/generate-payment-batch", {
        method: "POST",
      });
      const result = await res.json();

      if (!res.ok) {
        toast.error("Erreur : " + result.error);
      } else if (result.batches.length === 0) {
        toast.info("Aucun paiement à générer.");
      } else {
        toast.success(`✅ ${result.batches.length} lot(s) créés avec succès !`);
      }
    } catch (err) {
      toast.error("Erreur réseau.");
    }
  };

  const markBatchAsPaid = async (batchId: string) => {
    const res = await fetch("https://zwxegqevthzfphdqtjew.supabase.co/functions/v1/mark-payment-batch-paid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: batchId }),
    });

    const result = await res.json();

    if (!res.ok) {
      toast.error("Erreur : " + result.error);
    } else {
      toast.success("✅ Lot marqué comme payé !");
      // Refresh stats
      fetchStats();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <div className="flex gap-4">
          <button
            onClick={runAnomalyDetection}
            disabled={analyzing}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            {analyzing ? "Analyse en cours..." : "Analyser les dérives"}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtres
            <ChevronDown className="h-4 w-4 ml-2" />
          </button>
          <button
            onClick={fetchStats}
            className="p-2 text-gray-600 hover:text-gray-800 rounded-lg"
            title="Rafraîchir"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {analysisResult && (
        <p className="mt-2 text-sm text-gray-700">{analysisResult}</p>
      )}

      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="w-48 rounded-lg border-gray-300"
          >
            <option value="day">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="year">Cette année</option>
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Dossiers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalClaims}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
            <span className="text-emerald-500 font-medium">+12%</span>
            <span className="text-gray-600 ml-2">vs mois dernier</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En attente</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingClaims}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
            <span className="text-red-500 font-medium">-8%</span>
            <span className="text-gray-600 ml-2">vs mois dernier</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Montant Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalAmount.toLocaleString()} FCFA
              </p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-emerald-500 mr-1" />
            <span className="text-emerald-500 font-medium">+15%</span>
            <span className="text-gray-600 ml-2">vs mois dernier</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Délai Moyen</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.averageProcessingTime} jours
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingDown className="h-4 w-4 text-emerald-500 mr-1" />
            <span className="text-emerald-500 font-medium">-0.5j</span>
            <span className="text-gray-600 ml-2">vs mois dernier</span>
          </div>
        </div>
      </div>

      {/* Payment Batches Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Lots de Paiement</h2>
        <div className="space-y-4">
          {/* Example batch item */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Lot #2025-001</p>
              <p className="text-sm text-gray-600">3 établissements - 150,000 FCFA</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-yellow-600">En attente</span>
              <button
                onClick={() => markBatchAsPaid('2025-001')}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
              >
                Marquer comme payé
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-end space-x-4">
        <button
          onClick={() => {
            window.open("https://zwxegqevthzfphdqtjew.supabase.co/functions/v1/export-payment-csv", "_blank");
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center shadow-lg transition-all duration-200"
        >
          <Download className="h-5 w-5 mr-2" />
          Télécharger ordre de virement (CSV)
        </button>
        <button
          onClick={handleGenerateBatch}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg flex items-center shadow-lg transition-all duration-200"
        >
          <DollarSign className="h-5 w-5 mr-2" />
          Générer le lot de paiement
        </button>
      </div>
    </div>
  );
}