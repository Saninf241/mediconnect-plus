// src/components/layouts/MultispecialistAdminLayout.tsx

import LogoutButton from "../ui/LogoutButton";
import { Outlet } from "react-router-dom";

export default function MultispecialistAdminLayout() {
  return (
    <div className="flex">
      <aside className="w-64 h-screen bg-gray-900 text-white p-4 flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-bold mb-6">Espace Dirigeant</h2>
          <ul className="space-y-2 text-sm">
            {/* Pilotage */}
            <li>
              <a href="/multispecialist/admin" className="hover:underline">
                Dashboard
              </a>
            </li>
            <li>
              <a href="/multispecialist/admin/performance" className="hover:underline">
                Performance
              </a>
            </li>
            <li>
              <a href="/multispecialist/admin/statistics" className="hover:underline">
                Statistiques détaillées
              </a>
            </li>

            {/* Équipe */}
            <li className="mt-4 font-semibold text-gray-300">Équipe & Gestion</li>
            <li>
              <a href="/multispecialist/admin/manage-team" className="hover:underline">
                Gérer les Médecins
              </a>
            </li>
            <li>
              <a href="/multispecialist/admin/permissions" className="hover:underline">
                Accès & Permissions
              </a>
            </li>

            {/* Patients */}
            <li className="mt-4 font-semibold text-gray-300">Patients</li>
            <li>
              <a href="/multispecialist/admin/patients" className="hover:underline">
                Liste des patients
              </a>
            </li>
            <li>
              <a href="/multispecialist/admin/alerts" className="hover:underline">
                🚨 Alertes & incohérences
              </a>
            </li>

            {/* Paiements */}
            <li className="mt-4 font-semibold text-gray-300">Finances</li>
            <li>
              <a href="/multispecialist/admin/payments" className="hover:underline">
                Paiements
              </a>
            </li>
            <li>
              <a href="/multispecialist/admin/payment-logs" className="hover:underline">
                Historique de règlements
              </a>
            </li>

            {/* Support */}
            <li className="mt-4 font-semibold text-gray-300">Support</li>
            <li>
              <a href="/multispecialist/admin/support-inbox" className="hover:underline">
                📬 Messages de support
              </a>
            </li>
          </ul>
        </div>

        <div>
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 bg-gray-100 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
