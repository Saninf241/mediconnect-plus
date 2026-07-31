// src/components/layouts/MultispecialistAdminLayout.tsx
import { useEffect, useState } from "react";
import { Outlet, NavLink, Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import LogoutButton from "../ui/LogoutButton";
import NotificationBell from "../ui/NotificationBell";
import { supabase } from "../../lib/supabase";
import { useClinicId } from "../../hooks/useClinicId";

const NavItem = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <li>
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `block rounded-lg px-3 py-2 transition-colors ${
          isActive
            ? "bg-white/20 text-white font-semibold"
            : "text-sky-100 hover:bg-white/10 hover:text-white"
        }`
      }
    >
      {children}
    </NavLink>
  </li>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <li className="mt-5 px-3 text-xs font-semibold uppercase tracking-wide text-sky-300/80">
    {children}
  </li>
);

export default function MultispecialistAdminLayout() {
  const { user } = useUser();
  const { clinicId } = useClinicId();
  const [myStaffId, setMyStaffId] = useState<string | null>(null);

  useEffect(() => {
    if (!clinicId || !user?.id) return;
    supabase
      .from("clinic_staff")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("clerk_user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("[MultispecialistAdminLayout] erreur clinic_staff (moi) :", error.message);
        setMyStaffId(data?.id ?? null);
      });
  }, [clinicId, user?.id]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <aside className="w-72 bg-sky-800 text-white p-4 flex flex-col justify-between overflow-y-auto shrink-0">
        <div>
          <div className="mb-8 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold">Espace Dirigeant</h2>
              <p className="text-sm text-sky-100/80 mt-1">
                Pilotage du cabinet multi-spécialiste
              </p>
            </div>
            {myStaffId && (
              <NotificationBell
                staffId={myStaffId}
                types={["payment_dispute_resolved"]}
                buildPath={() => "/multispecialist/admin/payments"}
                dark
              />
            )}
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

        <div className="pt-6 border-t border-sky-700">
          <LogoutButton />
          <p className="text-xs text-sky-100/60 mt-3">
            <Link to="/mentions-legales" target="_blank" rel="noopener noreferrer" className="hover:text-white">Mentions légales</Link>
            {" · "}
            <Link to="/politique-confidentialite" target="_blank" rel="noopener noreferrer" className="hover:text-white">Confidentialité</Link>
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}