import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { UserRound, Users, Stethoscope, FileText, Settings } from 'lucide-react';
import { toast } from 'react-toastify';

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const [clinicName, setClinicName] = useState('');
  const [isTrusted, setIsTrusted] = useState(false);
  const [lastChecked, setLastChecked] = useState<number>(Date.now());
  const navigate = useNavigate();

  const localUser = typeof window !== 'undefined' ? localStorage.getItem('establishmentUser') : null;
  const parsedUser = localUser ? JSON.parse(localUser) : null;

  useEffect(() => {
    if (!isSignedIn && !parsedUser) {
      console.warn('[DoctorLayout] Utilisateur non signé (ni Clerk ni localStorage), redirection vers /');
      navigate('/');
    }
  }, [isSignedIn, parsedUser, navigate]);

  useEffect(() => {
    const fetchClinic = async () => {
      const effectiveUser = user ?? parsedUser;

      if (!effectiveUser) {
        console.warn('[DoctorLayout] Clerk non prêt (user ou isLoaded manquant)');
        return;
      }

      const email = effectiveUser.emailAddresses?.[0]?.emailAddress ?? effectiveUser.email;
      if (!email) {
        console.warn('[DoctorLayout] Aucun email trouvé');
        return;
      }

      const { data } = await supabase
        .from('clinic_staff')
        .select('clinic_id, is_trusted_doctor')
        .eq('email', email)
        .maybeSingle();

      if (data?.clinic_id) {
        const { data: clinic } = await supabase
          .from('clinics')
          .select('name')
          .eq('id', data.clinic_id)
          .maybeSingle();

        setClinicName(clinic?.name ?? '');
        setIsTrusted(data.is_trusted_doctor ?? false);
      }
    };

    fetchClinic();
  }, [isLoaded, user, parsedUser]);

  useEffect(() => {
    const checkStatusUpdates = async () => {
      const effectiveUser = user ?? parsedUser;
      const doctorId = effectiveUser?.id;
      if (!doctorId) return;

      const { data, error } = await supabase
        .from('consultations')
        .select('id, status, rejection_reason')
        .eq('doctor_id', doctorId)
        .gte('updated_at', new Date(lastChecked).toISOString());

      if (error || !data) return;

      data.forEach(consult => {
        if (consult.status === 'validated') {
          toast.success(`✅ Consultation validée (ID: ${consult.id})`);
        } else if (consult.status === 'rejected') {
          toast.error(`❌ Rejetée (ID: ${consult.id}) : ${consult.rejection_reason || 'Raison inconnue'}`);
        }
      });

      setLastChecked(Date.now());
    };

    const interval = setInterval(checkStatusUpdates, 30000); // toutes les 30s
    return () => clearInterval(interval);
  }, [user, parsedUser, lastChecked]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-blue-700 text-white px-4 py-3 flex justify-between items-center">
        <div className="text-lg font-semibold">{clinicName || 'MediConnect+'}</div>
        <div className="text-sm flex items-center gap-2">
          {(user?.firstName || parsedUser?.name) && (
            <>
              Dr. {user?.firstName ?? parsedUser.name} ({parsedUser?.role ?? 'doctor'})
              {isTrusted && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  ✅ Médecin fiable
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex">
        <aside className="w-60 bg-white border-r p-4 space-y-4">
          <nav className="flex flex-col gap-2">
            <button onClick={() => navigate('/doctor')} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-blue-50">
              <UserRound className="h-5 w-5" /> Dashboard
            </button>
            <button onClick={() => navigate('/doctor/patients')} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-blue-50">
              <Users className="h-5 w-5" /> Mes Patients
            </button>
            <button onClick={() => navigate('/doctor/new-act')} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-blue-50">
              <Stethoscope className="h-5 w-5" /> Démarrer consultation
            </button>
            <button onClick={() => navigate('/doctor/consultation-follow-up')} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-blue-50">
              <FileText className="h-5 w-5" /> Suivi des consultations
            </button>
            <button onClick={() => navigate('/doctor/settings')} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-blue-50">
              <Settings className="h-5 w-5" /> Paramètres
            </button>
            <button onClick={() => navigate('/doctor/performance')} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-blue-50">
              <FileText className="h-5 w-5" /> Performance
            </button>
          </nav>
        </aside>

        <main className="flex-1 p-6">
          <h1 className="text-xl font-bold text-blue-600 mb-4">Bienvenue dans l'espace médecin</h1>
          {children}
        </main>
      </div>
    </div>
  );
}
