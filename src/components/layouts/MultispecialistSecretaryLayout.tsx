// src/components/layouts/MultispecialistSecretaryLayout.tsx
import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import LogoutButton from "../ui/LogoutButton";

const linkBase =
  "block px-3 py-2 rounded-lg transition hover:bg-gray-800/60";
const linkActive = "bg-gray-800 text-white";
const linkInactive = "text-gray-300";

export default function MultispecialistSecretaryLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-900 text-white p-4">
        <h2 className="text-xl font-bold mb-4">Espace Secrétaire</h2>

        <nav className="space-y-2">
          <NavLink
            to="/multispecialist/secretary/patients"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            Mes Patients
          </NavLink>

          <NavLink
            to="/multispecialist/secretary/new"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            Ajouter un patient
          </NavLink>

          <NavLink
            to="/multispecialist/secretary/support"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
          >
            Support
          </NavLink>
        </nav>

        <div className="mt-6">
          <LogoutButton />
        </div>
      </aside>

      <main className="flex-1 bg-gray-100 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
