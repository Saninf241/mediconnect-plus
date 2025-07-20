import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { getDoctorPerformance } from '../../../lib/queries/doctors';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

export default function PerformancePage() {
  const { user } = useUser();
  const [performance, setPerformance] = useState<any>(null);
  const [subscription, setSubscription] = useState<string>('');

  useEffect(() => {
    const fetch = async () => {
      if (!user?.id) return;

      const { data: staff } = await supabase
        .from('clinic_staff')
        .select('clinic_id')
        .eq('id', user.id)
        .maybeSingle();

      if (!staff?.clinic_id) return;

      const { data: clinic } = await supabase
        .from('clinics')
        .select('subscription_plan')
        .eq('id', staff.clinic_id)
        .maybeSingle();

      setSubscription(clinic?.subscription_plan || '');

      if (clinic?.subscription_plan?.includes('premium')) {
        const data = await getDoctorPerformance(user.id);
        setPerformance(data?.[0] ?? null);
      }
    };
    fetch();
  }, [user]);

  //if (!subscription.includes('premium')) {
    //return (
      //<div className="p-6">
        //<h1 className="text-xl font-bold text-gray-700 mb-4">📊 Tableau de performance</h1>
        //<p className="text-gray-600">Cette fonctionnalité est réservée aux abonnés premium.</p>
     // </div>
    //);
  //}

  if (!performance) {
    return <div className="p-6">Chargement des données de performance...</div>;
  }

  const {
    avg_payment_delay,
    immediate_acceptance_rate,
    current_month_revenue,
    previous_month_revenue,
    monthly_revenues,
    monthly_delays,
    monthly_acceptance_rates
  } = performance;

  const trend =
    current_month_revenue > previous_month_revenue ? (
      <ArrowUpRight className="text-green-600 inline-block" />
    ) : (
      <ArrowDownRight className="text-red-600 inline-block" />
    );

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-blue-700">📊 Tableau de performance</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 shadow rounded border">
          <h3 className="text-lg font-semibold mb-1">💰 Revenus (ce mois)</h3>
          <p className="text-xl font-bold">
            {current_month_revenue.toLocaleString()} FCFA {trend}
          </p>
          <p className="text-sm text-gray-500">
            Mois précédent : {previous_month_revenue.toLocaleString()} FCFA
          </p>
        </div>

        <div className="bg-white p-4 shadow rounded border">
          <h3 className="text-lg font-semibold mb-1">⏱️ Délai moyen de paiement</h3>
          <p className="text-xl font-bold">{avg_payment_delay} jours</p>
        </div>

        <div className="bg-white p-4 shadow rounded border">
          <h3 className="text-lg font-semibold mb-1">✅ Acceptation immédiate</h3>
          <p className="text-xl font-bold">{immediate_acceptance_rate}%</p>
          <p className="text-sm text-gray-500">Objectif : {'>'} 90%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white shadow p-4 rounded border">
          <h4 className="text-md font-semibold mb-2">📈 Revenus mensuels</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthly_revenues}>
              <Line type="monotone" dataKey="value" stroke="#2563eb" />
              <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white shadow p-4 rounded border">
          <h4 className="text-md font-semibold mb-2">📊 Taux d’acceptation</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthly_acceptance_rates}>
              <Line type="monotone" dataKey="value" stroke="#10b981" />
              <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white shadow p-4 rounded border">
          <h4 className="text-md font-semibold mb-2">⏱️ Délai moyen de paiement</h4>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthly_delays}>
              <Line type="monotone" dataKey="value" stroke="#f97316" />
              <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
