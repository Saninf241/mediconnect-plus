// src/components/layouts/DoctorLayout.tsx
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../../lib/supabase';
import { useNavigate, NavLink, Outlet, Link } from 'react-router-dom';
import { UserRound, Users, Stethoscope, FileText, Settings, LineChart, LifeBuoy } from 'lucide-react';
import { toast } from 'react-toastify';
import { useDoctorContext } from '../../hooks/useDoctorContext';
import LogoutButton from '../ui/LogoutButton';

export default function DoctorLayout() {
  const { user, isLoaded, isSignedIn } = useUser();
  const doctorInfo = useDoctorContext();
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
      const doctorId = doctorInfo?.doctor_id;
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
  }, [doctorInfo, lastChecked]);

  const Item = (to: string, Icon: any, label: string) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg transition
         ${isActive ? 'bg-white/20 text-white font-semibold' : 'text-teal-100 hover:bg-white/10'}`
      }
      end
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-teal-50 via-white to-cyan-50">
      <div className="bg-teal-700 text-white px-5 py-3 flex justify-between items-center shadow shrink-0">
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

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 bg-teal-800 text-white p-5 space-y-4 shrink-0 overflow-y-auto flex flex-col">
          <div className="text-xl font-bold">Espace Médecin</div>
          <nav className="space-y-2">
            {Item('/doctor', UserRound, 'Dashboard')}
            {Item('/doctor/patients', Users, 'Mes patients')}
            {Item('/doctor/new-act', Stethoscope, 'Démarrer consultation')}
            {Item('/doctor/consultation-follow-up', FileText, 'Suivi des consultations')}
            {Item('/doctor/performance', LineChart, 'Performance')}
            {Item('/doctor/support', LifeBuoy, 'Support')}
            {Item('/doctor/settings', Settings, 'Paramètres')}
          </nav>
          <div className="pt-6 mt-auto">
            <LogoutButton />
            <p className="text-xs text-teal-200/70 mt-3">
              <Link to="/mentions-legales" target="_blank" rel="noopener noreferrer" className="hover:text-white">Mentions légales</Link>
              {" · "}
              <Link to="/politique-confidentialite" target="_blank" rel="noopener noreferrer" className="hover:text-white">Confidentialité</Link>
            </p>
          </div>
        </aside>

        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

