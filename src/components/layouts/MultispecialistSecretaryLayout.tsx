import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import LogoutButton from "../ui/LogoutButton";

export default function MultispecialistSecretaryLayout() {
  return (
    <div className="flex">
      <aside className="w-64 h-screen bg-gray-900 text-white p-4">
        <h2 className="text-xl font-bold mb-4">Espace Secrétaire</h2>
        <ul className="space-y-2">
          <li><a href="/multispecialist/secretary/patients">Mes Patients</a></li>
          <li><a href="/multispecialist/secretary/support">Support</a></li>
        </ul>

        <LogoutButton /> {/* 🔴 Ici */}
      </aside>

      <main className="flex-1 bg-gray-100 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
