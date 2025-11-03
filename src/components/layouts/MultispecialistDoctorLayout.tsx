// src/components/layouts/MultispecialistDoctorLayout.tsx
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Stethoscope, Users, PlusSquare, History, Gauge, Settings } from "lucide-react";

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
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-indigo-50 to-white">
      {/* Header simple */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-indigo-700 text-white flex items-center justify-between px-4 shadow">
        <div className="font-semibold">Cabinet MultiSpécialiste</div>
        {/* Avatar Clerk via <GlobalHeader /> au-dessus, donc rien ici */}
      </header>

      {/* Sidebar */}
      <aside className="w-72 bg-indigo-800 text-white pt-16 p-5 space-y-4">
        <div className="text-xl font-bold mb-2">Espace Médecin</div>
        <nav className="space-y-2">
          <Item to="dashboard" icon={Gauge} label="Dashboard" exact />
          <Item to="patients" icon={Users} label="Mes patients" />
          <Item to="new-consultation" icon={PlusSquare} label="Nouvelle consultation" />
          <Item to="consultation-follow-up" icon={History} label="Suivi des consultations" />
          <Item to="performance" icon={Stethoscope} label="Performance" />
          <Item to="settings" icon={Settings} label="Paramètres" />
        </nav>
        <div className="text-xs text-white/70 mt-6">
          Interface multi-spécialiste (indigo). Déconnexion via l’avatar (en haut à droite).
        </div>
      </aside>

      {/* Contenu */}
      <main className="flex-1 pt-16 p-6">
        <Outlet />
      </main>
    </div>
  );
}
