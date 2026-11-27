// src/App.tsx
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/clerk-react";
import SignUpPage from "./components/auth/SignUpPage";
import PrivateRouteByArea from "./components/auth/PrivateRouteByArea";
import Unauthorized from './Pages/Unauthorized';
import { useAuth } from "@clerk/clerk-react";
import { attachClerkToken } from "./lib/supabase";
import FingerprintCallback from "./Pages/FingerprintCallback";
import RoleRedirect from "./components/auth/RoleRedirect";
import SignInPage from "./components/auth/SignInPage";
import PatientPrivateRoute from "./components/auth/PatientPrivateRoute";
import { useLocation } from "react-router-dom";
import LandingPage from "./Pages/public/LandingPage";
import SiteFooter from "./components/layouts/SiteFooter";
import DebugReset from './Pages/DebugReset';
import RequireDeveloper from "./components/auth/RequireDeveloper";
import ScrollToTop from "./components/ScrollToTop";

// Chargement à la demande : chaque espace (médecin, secrétaire, admin,
// assureur, pharmacie, patient, développeur) ne télécharge son code que
// lorsqu'on y accède, au lieu d'un unique bundle de ~1,8 Mo chargé en entier
// dès la page d'accueil quel que soit l'espace visité.
const DoctorLayout = lazy(() => import('./components/layouts/DoctorLayout'));
const AssureurLayout = lazy(() => import('./components/layouts/AssureurLayout'));
const DashboardPage = lazy(() => import('./Pages/doctor/DashboardPage'));
const PerformancePage = lazy(() => import('./Pages/doctor/PerformancePage'));
const MultispecialistDoctorLayout = lazy(() => import('./components/layouts/MultispecialistDoctorLayout'));
const MultispecialistAdminLayout = lazy(() => import('./components/layouts/MultispecialistAdminLayout'));
const MultispecialistSecretaryLayout = lazy(() => import('./components/layouts/MultispecialistSecretaryLayout'));
const SpecialistSecretaryLayout = lazy(() => import('./components/layouts/SpecialistSecretaryLayout'));
const DoctorDashboardPage = lazy(() => import('./Pages/multispecialist/doctor/DoctorDashboardPage'));
const SecretaryPatientsPage = lazy(() => import('./Pages/multispecialist/secretary/SecretaryPatientsPage'));
const NewPatientWizard = lazy(() => import('./Pages/multispecialist/secretary/NewPatientWizard'));
const SecretaryAppointmentsPage = lazy(() => import('./Pages/multispecialist/secretary/SecretaryAppointmentsPage'));
const SupportPage = lazy(() => import('./Pages/multispecialist/secretary/SupportPage'));
const DoctorSupportPage = lazy(() => import('./Pages/doctor/SupportPage'));
const MultiDoctorSupportPage = lazy(() => import('./Pages/multispecialist/doctor/SupportPage'));
const AssureurSupportPage = lazy(() => import('./Pages/assureur/SupportPage'));
const PerformanceDoctorPage = lazy(() => import('./Pages/multispecialist/doctor/PerformanceDoctorPage'));
// Pages partagées entre cabinet spécialiste solo (/doctor/*) et multi-spécialiste (/multispecialist/doctor/*)
const PatientDetailsPage = lazy(() => import('./Pages/shared/doctor/PatientDetailsPage'));
const DoctorConsultationDetailsPage = lazy(() => import('./Pages/shared/doctor/ConsultationDetailsPage'));
const NewConsultationPage = lazy(() => import('./Pages/shared/doctor/NewConsultationPage'));
const SettingsPage = lazy(() => import('./Pages/shared/doctor/SettingsPage'));
const HistoriqueActesPage = lazy(() => import('./Pages/shared/doctor/HistoriqueActesPage'));
const PatientsPage = lazy(() => import('./Pages/shared/doctor/PatientsPage'));
const NewPatientPage = lazy(() => import('./Pages/shared/doctor/NewPatientPage'));
const DoctorPaymentsPage = lazy(() => import('./Pages/shared/doctor/PaymentsPage'));
const PharmacyLayout = lazy(() => import("./components/layouts/PharmacyLayout"));
const PharmacyDashboard = lazy(() => import("./Pages/pharmacy/PharmacyDashboard"));
const PharmacyOrders = lazy(() => import("./Pages/pharmacy/Orders"));
const PharmacyHistory = lazy(() => import("./Pages/pharmacy/History"));
const PharmacySettings = lazy(() => import("./Pages/pharmacy/Settings"));
const AssureurReports = lazy(() => import('./Pages/assureur/AssureurReports'));
const AssureurAnomalies = lazy(() => import('./Pages/assureur/AssureurAnomalies'));
const FingerprintAlertsPage = lazy(() => import('./Pages/assureur/FingerprintAlertsPage'));
const AssureurPaiements = lazy(() => import('./Pages/assureur/PaiementsPage'));
const StatistiquesPage = lazy(() => import('./Pages/assureur/StatistiquesPage'));
const CliniquesPage = lazy(() => import('./Pages/assureur/CliniquesPage'));
const ConsultationDetailsPage = lazy(() => import('./Pages/assureur/ConsultationDetailsPage'));
const MembersDirectoryPage = lazy(() => import('./Pages/assureur/MembersDirectoryPage'));
const AssureurSettingsPage = lazy(() => import('./Pages/assureur/AssureurSettingsPage'));
const AdminDashboardPage = lazy(() => import("./Pages/multispecialist/admin/AdminDashboardPage"));
const AdminConsultationsPage = lazy(() => import("./Pages/multispecialist/admin/AdminConsultationsPage"));
const AdminPerformancePage = lazy(() => import("./Pages/multispecialist/admin/AdminPerformancePage"));
const AdminPaymentsPage = lazy(() => import('./Pages/multispecialist/admin/AdminPaymentsPage'));
const AdminAlertsPage = lazy(() => import('./Pages/multispecialist/admin/AdminAlertsPage'));
const AdminPatientsPage = lazy(() => import('./Pages/multispecialist/admin/AdminPatientsPage'));
const AdminTeamPage = lazy(() => import('./Pages/multispecialist/admin/AdminTeamPage'));
const AdminSupportInboxPage = lazy(() => import('./Pages/multispecialist/admin/AdminSupportInboxPage'));
const AdminSettingsPage = lazy(() => import('./Pages/multispecialist/admin/AdminSettingsPage'));
const PatientLayout = lazy(() => import("./components/layouts/PatientLayout"));
const PatientLoginPage = lazy(() => import("./Pages/patient/Login"));
const PatientDashboard = lazy(() => import("./Pages/patient/Dashboard"));
const PatientIdentite = lazy(() => import("./Pages/patient/Identite"));
const PatientConsultations = lazy(() => import("./Pages/patient/Consultations"));
const PatientOrdonnances = lazy(() => import("./Pages/patient/Ordonnances"));
const PatientTraitements = lazy(() => import("./Pages/patient/Traitements"));
const PatientPharmacie = lazy(() => import("./Pages/patient/Pharmacie"));
const PatientRemboursements = lazy(() => import("./Pages/patient/Remboursements"));
const PatientSettings = lazy(() => import("./Pages/patient/Settings"));
const PatientSupport = lazy(() => import("./Pages/patient/Support"));
const DeveloperLayout = lazy(() => import("./components/layouts/DeveloperLayout"));
const DeveloperHome = lazy(() => import("./Pages/developer/DeveloperHome"));
const NewClinicPage = lazy(() => import("./Pages/developer/NewClinicPage"));
const NewInsurerPage = lazy(() => import("./Pages/developer/NewInsurerPage"));
const TicketsPage = lazy(() => import("./Pages/developer/TicketsPage"));
const ManageOrgsPage = lazy(() => import("./Pages/developer/ManageOrgsPage"));
const MergePatientsPage = lazy(() => import("./Pages/developer/MergePatientsPage"));
const MentionsLegales = lazy(() => import("./Pages/legal/MentionsLegales"));
const Confidentialite = lazy(() => import("./Pages/legal/Confidentialite"));

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center">
      <p className="text-sm text-gray-500">Chargement…</p>
    </div>
  );
}

function GlobalHeader() {
  const { pathname } = useLocation();
  const hideSignInOnHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        {/* Marque */}
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/logo.png"               // DOIT exister dans /public
            alt="MediConnect+"
            className="h-12 sm:h-14 md:h-16 w-auto"
            loading="eager"
            decoding="async"
          />
          {/* Si tu veux un mot-symbole à côté, décommente la ligne ci-dessous
          <span className="hidden sm:inline text-lg md:text-xl font-semibold text-gray-900">
            MediConnect+
          </span> */}
        </Link>

        {/* Côté droit */}
        <div className="flex items-center gap-3">
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>

          {!hideSignInOnHome && (
            <SignedOut>
              <Link to="/sign-in" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Se connecter
              </Link>
            </SignedOut>
          )}
        </div>
      </div>
    </header>
  );
}


export default function App() {
  const { isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const location = useLocation();
  // L'espace patient s'authentifie via Supabase Auth (téléphone/OTP), pas
  // Clerk : il ne doit pas rester bloqué sur cet écran si Clerk est lent
  // ou indisponible.
  const isPatientArea = location.pathname.startsWith("/patient");

  // Espaces connectés : chacun a déjà sa propre sidebar/en-tête en plein
  // écran, donc le footer marketing ne doit pas s'y ajouter (ça créait une
  // zone blanche avant d'atteindre le footer). On le réserve aux pages
  // publiques (accueil, connexion, pages légales...).
  const isAppArea =
    (isPatientArea && location.pathname !== "/patient/login") ||
    ["/doctor", "/assureur", "/multispecialist", "/specialist", "/pharmacy", "/developer"].some((p) =>
      location.pathname.startsWith(p)
    );

  // ✅ Sync Clerk JWT -> Supabase headers
  useEffect(() => {
    if (!isLoaded) return;

    let mounted = true;

    const syncToken = async () => {
      try {
        if (!isSignedIn) {
          if (mounted) attachClerkToken(null);
          return;
        }

        // JWT template "supabase" côté Clerk
        const token = await getToken({ template: "supabase" });
        if (mounted) attachClerkToken(token || null);
      } catch (e) {
        console.warn("[Clerk→Supabase] token sync failed", e);
        if (mounted) attachClerkToken(null);
      }
    };

    syncToken();

    // refresh périodique (token ~1h)
    const id = setInterval(syncToken, 55 * 60 * 1000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [isLoaded, isSignedIn, getToken]);

  // Pas de garde globale "Chargement..." ici : elle bloquait aussi les pages
  // publiques (accueil, mentions légales...) tant que Clerk n'avait pas fini
  // de charger. Chaque route protégée (PrivateRouteByArea, RequireDeveloper,
  // RoleRedirect, <SignIn>/<SignUp> de Clerk) gère déjà son propre état de
  // chargement le temps que Clerk soit prêt.

  return (
    <div className="min-h-screen flex flex-col">
    <ScrollToTop />
    {!isAppArea && <GlobalHeader />}
    <div className="flex-1 flex flex-col">
  <Suspense fallback={<RouteLoadingFallback />}>
  <Routes>
    {/* PUBLIC */}
    <Route path="/" element={<LandingPage />} />
    <Route path="/unauthorized" element={<Unauthorized />} />
    <Route path="/debug/reset" element={<DebugReset />} />
    <Route path="/mentions-legales" element={<MentionsLegales />} />
    <Route path="/politique-confidentialite" element={<Confidentialite />} />

    {/* Clerk auth */}
    <Route path="/sign-in/*" element={<SignInPage />} />
    <Route path="/sign-up/*" element={<SignUpPage />} />

    {/* Redirection post-login selon le rôle */}
    <Route path="/role-redirect" element={<RoleRedirect />} />

    {/* DOCTOR */}
    <Route
      path="/doctor/*"
      element={
        <PrivateRouteByArea allowedArea="specialist_doctor">
          <DoctorLayout/>
        </PrivateRouteByArea>
      }
    >
      <Route index element={<DashboardPage />} />
      <Route path="patients" element={<PatientsPage />} />
      <Route path="patients/new" element={<NewPatientPage />} />
      <Route path="new-act" element={<NewConsultationPage />} />
      <Route path="consultation-follow-up" element={<HistoriqueActesPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="performance" element={<PerformancePage />} />
      <Route path="payments" element={<DoctorPaymentsPage />} />
      <Route path="patients/:id" element={<PatientDetailsPage />} />
      <Route path="consultations/:id" element={<DoctorConsultationDetailsPage />} />
      <Route path="support" element={<DoctorSupportPage />} />
    </Route>

    {/* ASSUREUR */}
    <Route
      path="/assureur/*"
      element={
        <PrivateRouteByArea allowedArea="assureur">
          <AssureurLayout />
        </PrivateRouteByArea>
      }
    >
      <Route path="reports" element={<AssureurReports />} />
      <Route path="members-directory" element={<MembersDirectoryPage />} />
      <Route path="anomalies" element={<AssureurAnomalies />} />
      <Route path="fingerprint-alerts" element={<FingerprintAlertsPage />} />
      <Route path="paiements" element={<AssureurPaiements />} />
      <Route path="cliniques" element={<CliniquesPage />} />
      <Route path="statistiques" element={<StatistiquesPage />} />
      <Route path="consultations/:id" element={<ConsultationDetailsPage />} />
      <Route path="support" element={<AssureurSupportPage />} />
      <Route path="settings" element={<AssureurSettingsPage />} />
    </Route>

    {/* MULTISPECIALIST DOCTOR */}
    <Route
      path="/multispecialist/doctor/*"
      element={
        <PrivateRouteByArea allowedArea="multispecialist_doctor">
          <MultispecialistDoctorLayout />
        </PrivateRouteByArea>
      }
    >
      <Route index element={<DoctorDashboardPage />} />
      <Route path="patients" element={<PatientsPage />} />
      <Route path="patients/new" element={<NewPatientPage />} />
      <Route path="new-consultation" element={<NewConsultationPage />} />
      <Route path="consultation-follow-up" element={<HistoriqueActesPage />} />
      <Route path="performance" element={<PerformanceDoctorPage />} />
      <Route path="payments" element={<DoctorPaymentsPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="patients/:id" element={<PatientDetailsPage />} />
      <Route path="consultations/:id" element={<DoctorConsultationDetailsPage />} />
      <Route path="support" element={<MultiDoctorSupportPage />} />
    </Route>

    {/* MULTISPECIALIST ADMIN */}
    <Route
      path="/multispecialist/admin/*"
      element={
        <PrivateRouteByArea allowedArea="multispecialist_admin">
          <MultispecialistAdminLayout />
        </PrivateRouteByArea>
      }
    >
      <Route path="dashboard" element={<AdminDashboardPage />} />
      <Route path="consultations" element={<AdminConsultationsPage />} />
      <Route path="performance" element={<AdminPerformancePage />} />
      <Route path="payments" element={<AdminPaymentsPage />} />
      <Route path="alerts" element={<AdminAlertsPage />} />
      <Route path="patients" element={<AdminPatientsPage />} />
      <Route path="team" element={<AdminTeamPage />} />
      <Route path="support-inbox" element={<AdminSupportInboxPage />} />
      <Route path="settings" element={<AdminSettingsPage />} />
    </Route>

    {/* SECRETARY (multi-spécialiste) */}
    <Route
      path="/multispecialist/secretary/*"
      element={
          <PrivateRouteByArea allowedArea="multispecialist_secretary">
            <MultispecialistSecretaryLayout />
          </PrivateRouteByArea>
      }
    >
      <Route index element={<SecretaryPatientsPage />} />
      <Route path="patients" element={<SecretaryPatientsPage />} />
      <Route path="new" element={<NewPatientWizard />} />
      <Route path="appointments" element={<SecretaryAppointmentsPage />} />
      <Route path="support" element={<SupportPage />} />
    </Route>

    {/* SECRETARY (cabinet spécialiste) */}
    <Route
      path="/specialist/secretary/*"
      element={
          <PrivateRouteByArea allowedArea="specialist_secretary">
            <SpecialistSecretaryLayout />
          </PrivateRouteByArea>
      }
    >
      <Route index element={<SecretaryPatientsPage />} />
      <Route path="patients" element={<SecretaryPatientsPage />} />
      <Route path="new" element={<NewPatientWizard />} />
      <Route path="appointments" element={<SecretaryAppointmentsPage />} />
      <Route path="support" element={<SupportPage />} />
    </Route>

    {/* PHARMACY */}
    <Route
      path="/pharmacy/*"
      element={
        <PrivateRouteByArea allowedArea="pharmacy">
          <PharmacyLayout />
        </PrivateRouteByArea>
      }
    >
      <Route index element={<PharmacyDashboard />} />
      <Route path="orders" element={<PharmacyOrders />} />
      <Route path="history" element={<PharmacyHistory />} />
      <Route path="settings" element={<PharmacySettings />} />
    </Route>

    {/* PATIENT */}
    <Route path="/patient/login" element={<PatientLoginPage />} />
    <Route
      path="/patient/*"
      element={
        <PatientPrivateRoute>
          <PatientLayout />
        </PatientPrivateRoute>
      }
    >
      <Route index element={<PatientDashboard />} />
      <Route path="Identite" element={<PatientIdentite />} />
      <Route path="Consultations" element={<PatientConsultations />} />
      <Route path="Ordonnances" element={<PatientOrdonnances />} />
      <Route path="Traitements" element={<PatientTraitements />} />
      <Route path="Pharmacie" element={<PatientPharmacie />} />
      <Route path="Remboursements" element={<PatientRemboursements />} />
      <Route path="Settings" element={<PatientSettings />} />
      <Route path="Support" element={<PatientSupport />} />
    </Route>

    <Route path="/fp-callback" element={<FingerprintCallback />} />

    {/* DÉVELOPPEUR */}
    <Route
      path="/developer/*"
      element={
        <RequireDeveloper>
          <DeveloperLayout />
        </RequireDeveloper>
      }
    >
      <Route index element={<DeveloperHome />} />
      <Route path="clinics/new" element={<NewClinicPage clinicType="specialist_office" />} />
      <Route path="multispecialist/new" element={<NewClinicPage clinicType="multi_specialist" />} />
      <Route path="insurers/new" element={<NewInsurerPage />} />
      <Route path="tickets" element={<TicketsPage />} />
      <Route path="manage" element={<ManageOrgsPage />} />
      <Route path="merge-patients" element={<MergePatientsPage />} />
    </Route>

    <Route path="*" element={<Navigate to="/" />} />
  </Routes>
  </Suspense>
    </div>
    {!isAppArea && <SiteFooter />}
    </div>
);
}
