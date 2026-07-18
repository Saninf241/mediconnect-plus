// src/components/layouts/MultispecialistSecretaryLayout.tsx
import React from "react";
import { Outlet, NavLink, Link } from "react-router-dom";
import LogoutButton from "../ui/LogoutButton";

const linkBase =
  "block px-3 py-2 rounded-lg transition hover:bg-white/10";
const linkActive = "bg-white/20 text-white font-semibold";
const linkInactive = "text-sky-100";

export default function MultispecialistSecretaryLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 bg-sky-800 text-white p-4 flex flex-col overflow-y-auto shrink-0">
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

        <div className="mt-auto pt-6">
          <LogoutButton />
          <p className="text-xs text-sky-100/60 mt-3">
            <Link to="/mentions-legales" target="_blank" rel="noopener noreferrer" className="hover:text-white">Mentions légales</Link>
            {" · "}
            <Link to="/politique-confidentialite" target="_blank" rel="noopener noreferrer" className="hover:text-white">Confidentialité</Link>
          </p>
        </div>
      </aside>

      <main className="flex-1 bg-gray-100 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
