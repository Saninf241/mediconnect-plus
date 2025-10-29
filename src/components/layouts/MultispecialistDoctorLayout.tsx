// MultispecialistDoctorLayout.tsx
import { Outlet, NavLink } from "react-router-dom";
import { Stethoscope, Users, PlusSquare, History, Gauge, Settings } from "lucide-react";

export default function MultispecialistDoctorLayout() {
  const item = (to:string, Icon:any, label:string) => (
    <NavLink
      to={to}
      className={({isActive}) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition ${
          isActive ? "bg-white/15 font-semibold" : "opacity-90"
        }`
      }
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-72 bg-blue-800 text-white p-5 space-y-4">
        <div className="text-xl font-bold mb-4">Espace Médecin</div>
        <nav className="space-y-2">
          {item("/multispecialist/doctor/dashboard", Gauge, "Dashboard")}
          {item("/multispecialist/doctor/patients", Users, "Mes patients")}
          {item("/multispecialist/doctor/new-consultation", PlusSquare, "Nouvelle consultation")}
          {item("/multispecialist/doctor/consultation-follow-up", History, "Suivi des consultations")}
          {item("/multispecialist/doctor/performance", Stethoscope, "Performance")}
          {item("/multispecialist/doctor/settings", Settings, "Paramètres")}
        </nav>
        {/* Pas de bouton de déconnexion local : on laisse Clerk gérer */}
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
