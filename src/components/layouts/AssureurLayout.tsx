// src/components/layouts/AssureurLayout.tsx
import { Link, Outlet, useLocation } from "react-router-dom";
import LogoutButton from "../ui/LogoutButton";
import { useInsurerContext } from "../../hooks/useInsurerContext";

const navItems = [
  { name: "Rapports", path: "/assureur/reports" },
  { name: "Anomalies (tech)", path: "/assureur/anomalies" },
  { name: "Alertes empreinte", path: "/assureur/fingerprint-alerts" },
  { name: "Paiements", path: "/assureur/paiements" },
  { name: "Cliniques", path: "/assureur/cliniques" },
  { name: "Statistiques", path: "/assureur/statistiques" },
];

export default function AssureurLayout() {
  const location = useLocation();
  const { ctx, loading } = useInsurerContext();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Chargement de l’espace assureur…</p>
      </div>
    );
  }

  if (!ctx) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 text-center">
          <p className="text-lg font-semibold">
            Accès non autorisé à l’espace assureur.
          </p>
          <p className="text-sm text-gray-600 max-w-md mx-auto">
            Ce compte n’est relié à aucun assureur dans Mediconnect+.  
            Vérifie que l’email de connexion correspond bien à une ligne dans
            <code className="px-1 mx-1 rounded bg-gray-100">insurer_staff</code>.
          </p>
          <LogoutButton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-600 text-white p-6 space-y-4">
        <h2 className="text-2xl font-bold mb-2">Assureur</h2>
        <p className="text-xs text-indigo-100 mb-4">
          {ctx.email} • rôle : {ctx.role}
        </p>

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

        <div className="mt-8">
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 bg-gray-50 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

