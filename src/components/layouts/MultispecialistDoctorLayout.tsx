// src/components/layouts/MultispecialistDoctorLayout.tsx
import { Outlet, NavLink } from "react-router-dom";
import { Stethoscope, Users, PlusSquare, History, Gauge, Settings } from "lucide-react";
// Si tu veux l’avatar Clerk dans un header top bar plus tard :
// import { UserButton } from "@clerk/clerk-react";

export default function MultispecialistDoctorLayout() {
  const Item = (to: string, Icon: any, label: string) => (
    <NavLink
      to={to} // 🔹 chemin RELATIF (important)
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg transition
         hover:bg-white/10 ${isActive ? "bg-white/15 font-semibold" : "opacity-90"}`
      }
      end={to === "dashboard"}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-72 bg-blue-800 text-white p-5 space-y-4">
        <div className="text-xl font-bold mb-2">Espace Médecin</div>
        <nav className="space-y-2">
          {Item("dashboard", Gauge, "Dashboard")}
          {Item("patients", Users, "Mes patients")}
          {Item("new-consultation", PlusSquare, "Nouvelle consultation")}
          {Item("consultation-follow-up", History, "Suivi des consultations")}
          {Item("performance", Stethoscope, "Performance")}
          {Item("settings", Settings, "Paramètres")}
        </nav>
        {/* Pas de bouton de déconnexion : Clerk gère le menu utilisateur */}
      </aside>

      {/* Contenu */}
      <main className="flex-1 p-6">
        {/* Exemple de topbar si tu veux ajouter l’avatar plus tard :
        <div className="flex items-center justify-end mb-4">
          <UserButton afterSignOutUrl="/" />
        </div>
        */}
        <Outlet />
      </main>
    </div>
  );
}
