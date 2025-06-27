import React, { useState, useEffect } from 'react';
import { 
  Users, Building, BarChart, Settings, Calendar, Clock, 
  TrendingUp, FileText, AlertCircle, DollarSign, Activity,
  ChevronDown, ChevronUp, Filter, RefreshCw, Stethoscope,
  UserCheck, ClipboardList, ArrowUpRight, ArrowDownRight,
  UserPlus
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StaffManagement } from '../StaffManagement';

interface DashboardStats {
  totalPatients: number;
  totalConsultations: number;
  totalDoctors: number;
  averageWaitTime: number;
  consultationsByType: {
    type: string;
    count: number;
  }[];
  consultationsByStatus: {
    status: string;
    count: number;
  }[];
  recentActivity: {
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }[];
  revenue: {
    total: number;
    previousPeriod: number;
    percentageChange: number;
  };
  patientSatisfaction: number;
  upcomingAppointments: number;
  pendingReports: number;
}

interface FilterOptions {
  period: 'day' | 'week' | 'month' | 'year';
  department?: string;
  doctor?: string;
}

export function AdminInterface() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    totalConsultations: 0,
    totalDoctors: 0,
    averageWaitTime: 0,
    consultationsByType: [],
    consultationsByStatus: [],
    recentActivity: [],
    revenue: {
      total: 0,
      previousPeriod: 0,
      percentageChange: 0
    },
    patientSatisfaction: 0,
    upcomingAppointments: 0,
    pendingReports: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    period: 'month'
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, [filterOptions]);

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Récupération des statistiques depuis Supabase
      const { data: patientsCount } = await supabase
        .from('patients')
        .select('id', { count: 'exact' });

      const { data: consultationsCount } = await supabase
        .from('consultations')
        .select('id', { count: 'exact' });

      const { data: doctorsCount } = await supabase
        .from('clinic_staff')
        .select('id', { count: 'exact' })
        .eq('role', 'doctor');

      // Simulation des autres statistiques pour le mode test
      setStats({
        totalPatients: patientsCount?.length || 0,
        totalConsultations: consultationsCount?.length || 0,
        totalDoctors: doctorsCount?.length || 0,
        averageWaitTime: 15,
        consultationsByType: [
          { type: 'Routine', count: 45 },
          { type: 'Urgence', count: 15 },
          { type: 'Suivi', count: 30 },
          { type: 'Spécialiste', count: 10 }
        ],
        consultationsByStatus: [
          { status: 'Terminée', count: 75 },
          { status: 'En cours', count: 15 },
          { status: 'Annulée', count: 10 }
        ],
        recentActivity: [
          {
            id: '1',
            type: 'consultation',
            description: 'Nouvelle consultation - Dr. Martin',
            timestamp: new Date().toISOString()
          },
          {
            id: '2',
            type: 'patient',
            description: 'Nouveau patient enregistré',
            timestamp: new Date(Date.now() - 3600000).toISOString()
          }
        ],
        revenue: {
          total: 25000,
          previousPeriod: 22000,
          percentageChange: 13.64
        },
        patientSatisfaction: 92,
        upcomingAppointments: 8,
        pendingReports: 3
      });
    } catch (err) {
      console.error('Erreur lors du chargement des statistiques:', err);
      setError('Une erreur est survenue lors du chargement des statistiques');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec filtres */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord</h1>
            <p className="text-gray-600">Vue d'ensemble de l'activité de la clinique</p>
          </div>
          <div className="flex items-center space-x-4">
            <StaffManagement />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Filter className="h-5 w-5 mr-2" />
              Filtres
              {showFilters ? (
                <ChevronUp className="h-5 w-5 ml-2" />
              ) : (
                <ChevronDown className="h-5 w-5 ml-2" />
              )}
            </button>
            <button
              onClick={fetchDashboardStats}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Rafraîchir les données"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Période
              </label>
              <select
                value={filterOptions.period}
                onChange={(e) => setFilterOptions({
                  ...filterOptions,
                  period: e.target.value as FilterOptions['period']
                })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option value="day">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
                <option value="year">Cette année</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service
              </label>
              <select
                value={filterOptions.department || ''}
                onChange={(e) => setFilterOptions({
                  ...filterOptions,
                  department: e.target.value || undefined
                })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option value="">Tous les services</option>
                <option value="general">Médecine générale</option>
                <option value="cardio">Cardiologie</option>
                <option value="pediatrie">Pédiatrie</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Médecin
              </label>
              <select
                value={filterOptions.doctor || ''}
                onChange={(e) => setFilterOptions({
                  ...filterOptions,
                  doctor: e.target.value || undefined
                })}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
              >
                <option value="">Tous les médecins</option>
                <option value="1">Dr. Martin</option>
                <option value="2">Dr. Dubois</option>
                <option value="3">Dr. Laurent</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex">
            <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Patients</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPatients}</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg">
              <Users className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowUpRight className="h-4 w-4 text-emerald-500 mr-1" />
            <span className="text-emerald-500 font-medium">+12%</span>
            <span className="text-gray-600 ml-2">vs mois précédent</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Consultations</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalConsultations}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Stethoscope className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowUpRight className="h-4 w-4 text-emerald-500 mr-1" />
            <span className="text-emerald-500 font-medium">+8%</span>
            <span className="text-gray-600 ml-2">vs mois précédent</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Chiffre d'affaires</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.revenue.total)}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            {stats.revenue.percentageChange >= 0 ? (
              <>
                <ArrowUpRight className="h-4 w-4 text-emerald-500 mr-1" />
                <span className="text-emerald-500 font-medium">
                  +{stats.revenue.percentageChange.toFixed(1)}%
                </span>
              </>
            ) : (
              <>
                <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                <span className="text-red-500 font-medium">
                  {stats.revenue.percentageChange.toFixed(1)}%
                </span>
              </>
            )}
            <span className="text-gray-600 ml-2">vs mois précédent</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Satisfaction</p>
              <p className="text-2xl font-bold text-gray-900">{stats.patientSatisfaction}%</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <UserCheck className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <ArrowUpRight className="h-4 w-4 text-emerald-500 mr-1" />
            <span className="text-emerald-500 font-medium">+2%</span>
            <span className="text-gray-600 ml-2">vs mois précédent</span>
          </div>
        </div>
      </div>

      {/* Graphiques et statistiques détaillées */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Types de consultations */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <Activity className="h-6 w-6 text-emerald-600 mr-2" />
            Types de Consultations
          </h3>
          <div className="space-y-4">
            {stats.consultationsByType.map((type) => (
              <div key={type.type} className="flex items-center">
                <div className="w-32 text-sm font-medium text-gray-600">
                  {type.type}
                </div>
                <div className="flex-1">
                  <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
                      style={{
                        width: `${(type.count / stats.totalConsultations) * 100}%`
                      }}
                    />
                  </div>
                </div>
                <div className="w-16 text-right text-sm font-medium text-gray-900">
                  {type.count}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activité récente */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <ClipboardList className="h-6 w-6 text-emerald-600 mr-2" />
            Activité Récente
          </h3>
          <div className="space-y-4">
            {stats.recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center">
                  {activity.type === 'consultation' ? (
                    <Stethoscope className="h-5 w-5 text-blue-600 mr-3" />
                  ) : (
                    <Users className="h-5 w-5 text-emerald-600 mr-3" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{activity.description}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(activity.timestamp).toLocaleString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Indicateurs supplémentaires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Temps d'attente</h3>
            <Clock className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.averageWaitTime} min</p>
          <p className="text-sm text-gray-600 mt-2">Temps d'attente moyen</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">RDV à venir</h3>
            <Calendar className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.upcomingAppointments}</p>
          <p className="text-sm text-gray-600 mt-2">Dans les prochaines 24h</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Rapports en attente</h3>
            <FileText className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.pendingReports}</p>
          <p className="text-sm text-gray-600 mt-2">À finaliser</p>
        </div>
      </div>
    </div>
  );
}