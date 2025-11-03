// src/components/layouts/DoctorLayout.tsx
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../../lib/supabase';
import { useNavigate, NavLink, Outlet } from 'react-router-dom';
import { UserRound, Users, Stethoscope, FileText, Settings, LineChart } from 'lucide-react';
import { toast } from 'react-toastify';

export default function DoctorLayout() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [clinicName, setClinicName] = useState('MediConnect+');
  const [isTrusted, setIsTrusted] = useState(false);
  const [lastChecked, setLastChecked] = useState<number>(Date.now());
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { navigate('/'); return; }

    (async () => {
      const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
      if (!email) return;

      const { data: staff } = await supabase
        .from('clinic_staff')
        .select('clinic_id, is_trusted_doctor, role')
        .eq('email', email)
        .maybeSingle();

      if (!staff || staff.role !== 'doctor') return;
      setIsTrusted(!!staff.is_trusted_doctor);

      if (staff.clinic_id) {
        const { data: clinic } = await supabase
          .from('clinics')
          .select('name')
          .eq('id', staff.clinic_id)
          .maybeSingle();

        if (clinic?.name) setClinicName(clinic.name);
      }
    })();
  }, [isLoaded, isSignedIn, user, navigate]);

  useEffect(() => {
    const timer = setInterval(async () => {
      const doctorId = user?.id;
      if (!doctorId) return;
      const { data } = await supabase
        .from('consultations')
        .select('id, status, rejection_reason')
        .eq('doctor_id', doctorId)
        .gte('updated_at', new Date(lastChecked).toISOString());
      data?.forEach(c => {
        if (c.status === 'validated') toast.success(`✅ Consultation validée (${c.id})`);
        if (c.status === 'rejected') toast.error(`❌ Rejetée (${c.id}) : ${c.rejection_reason || '—'}`);
      });
      setLastChecked(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, [user, lastChecked]);

  const Item = (to: string, Icon: any, label: string) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg transition
         ${isActive ? 'bg-white/20 text-white font-semibold' : 'text-violet-100 hover:bg-white/10'}`
      }
      end
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-fuchsia-50">
      <div className="bg-violet-700 text-white px-5 py-3 flex justify-between items-center shadow">
        <div className="text-lg font-semibold">{clinicName}</div>
        <div className="text-sm flex items-center gap-2">
          {user?.firstName && <>Dr. {user.firstName}</>}
          {isTrusted && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
              ✅ Médecin fiable
            </span>
          )}
        </div>
      </div>

      <div className="flex">
        <aside className="w-72 bg-violet-800 text-white p-5 space-y-4 min-h-[calc(100vh-52px)]">
          <div className="text-xl font-bold">Espace Médecin</div>
          <nav className="space-y-2">
            {Item('/doctor', UserRound, 'Dashboard')}
            {Item('/doctor/patients', Users, 'Mes patients')}
            {Item('/doctor/new-act', Stethoscope, 'Démarrer consultation')}
            {Item('/doctor/consultation-follow-up', FileText, 'Suivi des consultations')}
            {Item('/doctor/performance', LineChart, 'Performance')}
            {Item('/doctor/settings', Settings, 'Paramètres')}
          </nav>
          <div className="text-xs text-violet-200/80 pt-6">
            Espace “spécialiste simple” (style violet). Déconnexion via Clerk (en haut à droite).
          </div>
        </aside>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

