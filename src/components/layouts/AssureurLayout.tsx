// src/components/layouts/AssureurLayout.tsx
import { NavLink, Outlet, Link } from "react-router-dom";
import {
  FileText,
  Users,
  AlertTriangle,
  Fingerprint,
  Wallet,
  Building2,
  LineChart,
  LifeBuoy,
  Settings,
} from "lucide-react";
import LogoutButton from "../ui/LogoutButton";
import NotificationBell from "../ui/assureur/NotificationBell";
import { useInsurerContext } from "../../hooks/useInsurerContext";

const navItems = [
  { name: "Rapports", path: "/assureur/reports", icon: FileText },
  { name: "Base adhérents", path: "/assureur/members-directory", icon: Users },
  { name: "Anomalies", path: "/assureur/anomalies", icon: AlertTriangle },
  { name: "Alertes empreinte", path: "/assureur/fingerprint-alerts", icon: Fingerprint },
  { name: "Paiements", path: "/assureur/paiements", icon: Wallet },
  { name: "Cliniques", path: "/assureur/cliniques", icon: Building2 },
  { name: "Statistiques", path: "/assureur/statistiques", icon: LineChart },
  { name: "Support", path: "/assureur/support", icon: LifeBuoy },
  { name: "Paramètres", path: "/assureur/settings", icon: Settings },
];

export default function AssureurLayout() {
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
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-600 text-white p-6 flex flex-col shrink-0 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Assureur</h2>

        <nav className="space-y-1 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 rounded transition ${
                  isActive ? "bg-indigo-800 font-semibold" : "hover:bg-indigo-500"
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-6">
          <LogoutButton />
          <p className="text-xs text-indigo-100/70 mt-3">
            <Link to="/mentions-legales" target="_blank" rel="noopener noreferrer" className="hover:text-white">Mentions légales</Link>
            {" · "}
            <Link to="/politique-confidentialite" target="_blank" rel="noopener noreferrer" className="hover:text-white">Confidentialité</Link>
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-white border-b flex items-center justify-between px-6 shrink-0">
          <div className="text-sm text-gray-600">
            {ctx.email} • <span>{ctx.role === "admin" ? "administrateur" : "agent"}</span>
          </div>
          <NotificationBell staffId={ctx.staffId} />
        </header>

        <main className="flex-1 p-6 bg-gray-50 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
