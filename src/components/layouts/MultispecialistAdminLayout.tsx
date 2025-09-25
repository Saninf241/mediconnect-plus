// src/components/layouts/MultispecialistAdminLayout.tsx
import { Outlet, NavLink } from "react-router-dom";
import LogoutButton from "../ui/LogoutButton";

const NavItem = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <li>
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `block rounded px-3 py-2 hover:bg-gray-800 ${
          isActive ? "bg-gray-800 font-semibold" : "text-gray-200"
        }`
      }
    >
      {children}
    </NavLink>
  </li>
);

export default function MultispecialistAdminLayout() {
  return (
    <div className="flex">
      <aside className="w-64 h-screen bg-gray-900 text-white p-4 flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-bold mb-6">Espace Dirigeant</h2>
          <ul className="space-y-1 text-sm">
            {/* Pilotage */}
            <NavItem to="/multispecialist/admin/dashboard">Dashboard</NavItem>
            <NavItem to="/multispecialist/admin/performance">Performance</NavItem>
            <NavItem to="/multispecialist/admin/statistics">Statistiques détaillées</NavItem>

            {/* Équipe */}
            <li className="mt-4 font-semibold text-gray-300 px-3">Équipe & Gestion</li>
            <NavItem to="/multispecialist/admin/team">Gérer les Médecins</NavItem>
            <NavItem to="/multispecialist/admin/permissions">Accès & Permissions</NavItem>

            {/* Patients */}
            <li className="mt-4 font-semibold text-gray-300 px-3">Patients</li>
            <NavItem to="/multispecialist/admin/patients">Liste des patients</NavItem>
            <NavItem to="/multispecialist/admin/alerts">🚨 Alertes & incohérences</NavItem>

            {/* Finances */}
            <li className="mt-4 font-semibold text-gray-300 px-3">Finances</li>
            <NavItem to="/multispecialist/admin/payments">Paiements</NavItem>
            <NavItem to="/multispecialist/admin/payment-logs">Historique de règlements</NavItem>

            {/* Support */}
            <li className="mt-4 font-semibold text-gray-300 px-3">Support</li>
            <NavItem to="/multispecialist/admin/support-inbox">📬 Messages de support</NavItem>
          </ul>
        </div>
        <div><LogoutButton /></div>
      </aside>

      <main className="flex-1 bg-gray-100 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
