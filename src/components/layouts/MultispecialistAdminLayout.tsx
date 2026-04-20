// src/components/layouts/MultispecialistAdminLayout.tsx
import { Outlet, NavLink } from "react-router-dom";
import LogoutButton from "../ui/LogoutButton";

const NavItem = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <li>
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `block rounded-lg px-3 py-2 transition-colors ${
          isActive
            ? "bg-white text-gray-900 font-semibold"
            : "text-gray-200 hover:bg-gray-800 hover:text-white"
        }`
      }
    >
      {children}
    </NavLink>
  </li>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <li className="mt-5 px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
    {children}
  </li>
);

export default function MultispecialistAdminLayout() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-72 bg-gray-900 text-white p-4 flex flex-col justify-between">
        <div>
          <div className="mb-8">
            <h2 className="text-xl font-bold">Espace Dirigeant</h2>
            <p className="text-sm text-gray-400 mt-1">
              Pilotage du cabinet multi-spécialiste
            </p>
          </div>

          <ul className="space-y-1 text-sm">
            <SectionTitle>Vue d’ensemble</SectionTitle>
            <NavItem to="/multispecialist/admin/dashboard">Tableau de bord</NavItem>

            <SectionTitle>Activité</SectionTitle>
            <NavItem to="/multispecialist/admin/consultations">Consultations</NavItem>
            <NavItem to="/multispecialist/admin/performance">Performance des médecins</NavItem>

            <SectionTitle>Finance</SectionTitle>
            <NavItem to="/multispecialist/admin/payments">Paiements & règlements</NavItem>

            <SectionTitle>Pilotage</SectionTitle>
            <NavItem to="/multispecialist/admin/alerts">Alertes à surveiller</NavItem>
            <NavItem to="/multispecialist/admin/patients">Patients</NavItem>
            <NavItem to="/multispecialist/admin/team">Équipe</NavItem>

            <SectionTitle>Administration</SectionTitle>
            <NavItem to="/multispecialist/admin/support-inbox">Support</NavItem>
            <NavItem to="/multispecialist/admin/settings">Paramètres & accès</NavItem>
          </ul>
        </div>

        <div className="pt-6 border-t border-gray-800">
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}