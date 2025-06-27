// src/components/layouts/AssureurLayout.tsx
import { Link, Outlet, useLocation } from "react-router-dom";

const navItems = [
  { name: "Rapports", path: "/assureur/reports" },
  { name: "Anomalies (tech)", path: "/assureur/anomalies" },
  { name: "Alertes empreinte", path: "/assureur/fingerprint-alerts" },
  { name: "Paiements", path: "/assureur/paiements" },
  { name: "Cliniques", path: "/assureur/cliniques" },
  { name: "Statistiques", path: "/assureur/statistiques" }
];

export default function AssureurLayout() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-600 text-white p-6 space-y-4">
        <h2 className="text-2xl font-bold mb-6">Assureur</h2>
        <nav className="space-y-3">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-4 py-2 rounded hover:bg-indigo-500 ${
                location.pathname === item.path ? "bg-indigo-800" : ""
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 bg-gray-50 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
