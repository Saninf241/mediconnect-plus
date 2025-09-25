// components/layouts/PatientLayout.tsx
import { Outlet, NavLink } from "react-router-dom";

export default function PatientLayout() {
  return (
    <div className="flex h-screen">
      <aside className="w-60 bg-emerald-700 text-white p-4">
        <nav className="flex flex-col space-y-4">
          <NavLink to="/patient">Tableau de bord</NavLink>
          <NavLink to="/patient/Consultations">Consultations</NavLink>
          <NavLink to="/patient/Ordonnances">Ordonnances</NavLink>
          <NavLink to="/patient/Antecedents">Antécédents</NavLink>
          <NavLink to="/patient/Pharmacie">Pharmacie</NavLink>
          <NavLink to="/patient/Rendezvous">Rendez-vous</NavLink>
          <NavLink to="/patient/Traitements">Traitements</NavLink>
          <NavLink to="/patient/Settings">Paramètres</NavLink>
        </nav>
      </aside>
      <main className="flex-1 p-4 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
