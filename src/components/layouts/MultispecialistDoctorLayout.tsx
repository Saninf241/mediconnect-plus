// src/components/layouts/MultispecialistDoctorLayout.tsx
import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { Outlet, NavLink } from "react-router-dom";
import { Stethoscope, Users, PlusSquare, History, Gauge, Settings, LifeBuoy } from "lucide-react";
import { toast } from "react-toastify";
import { supabase } from "../../lib/supabase";
import { useDoctorContext } from "../../hooks/useDoctorContext";
import LogoutButton from "../ui/LogoutButton";

const Item = ({
  to,
  icon: Icon,
  label,
  exact,
}: {
  to: string;
  icon: any;
  label: string;
  exact?: boolean;
}) => (
  <NavLink
    to={to}
    end={!!exact}
    className={({ isActive }) =>
      `flex items-center gap-3 px-3 py-2 rounded-lg transition
       hover:bg-white/10 ${isActive ? "bg-white/15 font-semibold" : "opacity-90"}`
    }
  >
    <Icon className="w-5 h-5" />
    <span>{label}</span>
  </NavLink>
);

export default function MultispecialistDoctorLayout() {
  const { user } = useUser();
  const doctorInfo = useDoctorContext();
  const [isTrusted, setIsTrusted] = useState(false);
  const [lastChecked, setLastChecked] = useState<number>(Date.now());

  useEffect(() => {
    (async () => {
      const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
      if (!email) return;

      const { data: staff } = await supabase
        .from("clinic_staff")
        .select("is_trusted_doctor, role")
        .eq("email", email)
        .maybeSingle();

      if (staff?.role === "doctor") setIsTrusted(!!staff.is_trusted_doctor);
    })();
  }, [user]);

  useEffect(() => {
    const timer = setInterval(async () => {
      const doctorId = doctorInfo?.doctor_id;
      if (!doctorId) return;
      const { data } = await supabase
        .from("consultations")
        .select("id, status, rejection_reason")
        .eq("doctor_id", doctorId)
        .gte("updated_at", new Date(lastChecked).toISOString());
      data?.forEach((c) => {
        if (c.status === "validated") toast.success(`✅ Consultation validée (${c.id})`);
        if (c.status === "rejected") toast.error(`❌ Rejetée (${c.id}) : ${c.rejection_reason || "—"}`);
      });
      setLastChecked(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, [doctorInfo, lastChecked]);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-sky-50 to-white">
      {/* Header simple */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-sky-700 text-white flex items-center justify-between px-4 shadow">
        <div className="font-semibold">Cabinet MultiSpécialiste</div>
        {isTrusted && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
            ✅ Médecin fiable
          </span>
        )}
      </header>

      {/* Sidebar */}
      <aside className="w-72 bg-sky-800 text-white pt-16 p-5 space-y-4">
        <div className="text-xl font-bold mb-2">Espace Médecin</div>
        <nav className="space-y-2">
          <Item to="/multispecialist/doctor" icon={Gauge} label="Dashboard" exact />
          <Item to="patients" icon={Users} label="Mes patients" />
          <Item to="new-consultation" icon={PlusSquare} label="Nouvelle consultation" />
          <Item to="consultation-follow-up" icon={History} label="Suivi des consultations" />
          <Item to="performance" icon={Stethoscope} label="Performance" />
          <Item to="support" icon={LifeBuoy} label="Support" />
          <Item to="settings" icon={Settings} label="Paramètres" />
        </nav>
        <div className="mt-6">
          <LogoutButton />
        </div>
      </aside>

      {/* Contenu */}
      <main className="flex-1 pt-16 p-6">
        <Outlet />
      </main>
    </div>
  );
}
