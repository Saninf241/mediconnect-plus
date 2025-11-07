// src/App.tsx
import { Routes, Route, Navigate, useNavigate, Link, Outlet } from 'react-router-dom';
import { RedirectToSignIn } from "@clerk/clerk-react";
import { useState, useEffect, FormEvent } from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { SignedIn, SignedOut, UserButton, useUser, useClerk } from "@clerk/clerk-react";
import ClerkGuard from "./components/auth/ClerkGuard";
import DoctorLayout from './components/layouts/DoctorLayout';
import AssureurLayout from './components/layouts/AssureurLayout';
import DashboardPage from './Pages/doctor/DashboardPage';
import PatientsPage from './Pages/doctor/PatientsPage';
import NewActPage from './Pages/doctor/NewActPage';
import NewPatientPage from './Pages/doctor/NewPatientPage';
import ConsultationFollowUpPage from './Pages/doctor/ConsultationFollowUpPage';
import SettingsPage from './Pages/doctor/SettingsPage';
import { Building, Code, AlertCircle, User } from 'lucide-react';
import PerformancePage from './Pages/doctor/PerformancePage';
import MultispecialistDoctorLayout from './components/layouts/MultispecialistDoctorLayout';
import MultispecialistAdminLayout from './components/layouts/MultispecialistAdminLayout';
import MultispecialistSecretaryLayout from './components/layouts/MultispecialistSecretaryLayout';
import DoctorDashboardPage from './Pages/multispecialist/doctor/DoctorDashboardPage';
import DoctorPatientsPage from './Pages/multispecialist/doctor/DoctorPatientsPage';
import NewConsultationPage  from './Pages/multispecialist/doctor/NewConsultationPage';
import SecretaryPatientsPage  from './Pages/multispecialist/secretary/SecretaryPatientsPage'; 
import NewPatientWizard from './Pages/multispecialist/secretary/NewPatientWizard';
import SupportPage from './Pages/multispecialist/secretary/SupportPage';
import PrivateRouteByRole from "./components/auth/PrivateRouteByRole";
import Unauthorized from './Pages/Unauthorized';
import NewPatientDoctorPage from './Pages/multispecialist/doctor/NewPatientDoctorPage';
import ConsultationDoctorFollowUpPage from './Pages/multispecialist/doctor/ConsultationDoctorFollowUpPage';
import SettingsDoctorPage from './Pages/multispecialist/doctor/SettingsDoctorPage';
import PerformanceDoctorPage from './Pages/multispecialist/doctor/PerformanceDoctorPage';
import DoctorPatientDetailsPage from "./Pages/multispecialist/doctor/DoctorPatientDetailsPage";
import { BrowserRouter as Router } from "react-router-dom";
import PatientLayout from "./components/layouts/PatientLayout";
import Dashboard from "./Pages/patient/Dashboard";
import Consultations from "./Pages/patient/Consultations";
import Ordonnances from "./Pages/patient/Ordonnances";
import Traitements from "./Pages/patient/Traitements";
import Antecedents from "./Pages/patient/Antecedents";
import Pharmacie from "./Pages/patient/Pharmacie";
import Rendezvous from "./Pages/patient/Rendezvous";
import Identite from "./Pages/patient/Identite";
import Settings from "./Pages/patient/Settings";
import PatientLogin from './Pages/PatientLogin';
import PharmacyLayout from "./components/layouts/PharmacyLayout";
import PharmacyDashboard from "./Pages/pharmacy/PharmacyDashboard";
import PharmacyOrders from "./Pages/pharmacy/Orders";
import PharmacyHistory from "./Pages/pharmacy/History";
import PharmacySettings from "./Pages/pharmacy/Settings";
import { supabase } from './lib/supabase';
import AssureurReports from './Pages/assureur/AssureurReports';
import AssureurAnomalies from './Pages/assureur/AssureurAnomalies';
import FingerprintAlertsPage from './Pages/assureur/FingerprintAlertsPage';
import AssureurPaiements from './Pages/assureur/PaiementsPage';
import StatistiquesPage from './Pages/assureur/StatistiquesPage';
import CliniquesPage from './Pages/assureur/CliniquesPage';
import AdminDashboardPage from "./Pages/multispecialist/admin/AdminDashboardPage";
import PerformanceAdminPage from "./Pages/multispecialist/admin/PerformanceAdminPage";
import StatisticsPage from "./Pages/multispecialist/admin/StatisticsPage";
import ManageTeamPage from "./Pages/multispecialist/admin/ManageTeamPage";
import PermissionsPage from "./Pages/multispecialist/admin/PermissionsPage";
import PatientsAdminPage from "./Pages/multispecialist/admin/PatientsAdminPage";
import AlertsPage from "./Pages/multispecialist/admin/AlertsPage";
import PaymentsPage from "./Pages/multispecialist/admin/PaymentsPage";
import PaymentLogsPage from "./Pages/multispecialist/admin/PaymentLogsPage";
import SupportInboxPage from "./Pages/multispecialist/admin/SupportInboxPage";
import { useAuth } from "@clerk/clerk-react";
import { attachClerkToken } from "./lib/supabase";
import FingerprintCallback from "./Pages/FingerprintCallback";
import { normalizeRole } from "./components/auth/role-utils";
import RoleRedirect from "./components/auth/RoleRedirect";
import React from 'react';
import SignInPage from "./components/auth/SignInPage";
import { useLocation } from "react-router-dom";
import { Facebook, Linkedin, Twitter, Mail, MessageCircle } from "lucide-react";
import DebugReset from './Pages/DebugReset';


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


function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} MediConnect+
        </p>

        <div className="flex items-center gap-4">
          {/* Remplace les href par tes vrais liens */}
          <a
            href="https://www.linkedin.com/company/mediconnect-plus"
            target="_blank" rel="noreferrer"
            aria-label="LinkedIn"
            className="text-gray-500 hover:text-indigo-600"
            title="LinkedIn"
          >
            <Linkedin className="h-5 w-5" />
          </a>

          <a
            href="https://facebook.com/mediconnectplus"
            target="_blank" rel="noreferrer"
            aria-label="Facebook"
            className="text-gray-500 hover:text-indigo-600"
            title="Facebook"
          >
            <Facebook className="h-5 w-5" />
          </a>

          <a
            href="https://wa.me/0033782525687?text=Je%20souhaite%20participer%20%C3%A0%20la%20phase%20pilote%20MARS%202026"
            target="_blank" rel="noreferrer"
            aria-label="WhatsApp"
            className="text-gray-500 hover:text-indigo-600"
            title="WhatsApp"
          >
            <MessageCircle className="h-5 w-5" />
          </a>

          <a
            href="mailto:contact@ndoungconsulting.com?subject=Inscription%20phase%20pilote&body=Bonjour%2C%20je%20souhaite%20participer%20%C3%A0%20la%20phase%20pilote."
            className="text-gray-500 hover:text-indigo-600"
            aria-label="Email"
            title="Email"
          >
            <Mail className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}


export default function App() {
  const { isLoaded } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('doctor');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  if (!isLoaded) return; 
  let mounted = true;
  const syncToken = async () => {
    try {
      // ⚠️ crée un JWT Template "supabase" dans Clerk (Dashboard → JWT Templates)
      const token = await getToken({ template: "supabase" });
      if (mounted) attachClerkToken(token);
    } catch {
      // Pas de session Clerk → pas d’Authorization header
      if (mounted) attachClerkToken(null);
    }
  };

  syncToken();
  // Re-synchroniser le token avant son expiry (~1h)
  const id = setInterval(syncToken, 55 * 60 * 1000);
  return () => { mounted = false; clearInterval(id); };
}, [getToken]);


  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        Chargement...
      </div>
    );
  }

  function SignOutPage() {
  const { signOut } = useClerk();
  const navigate = useNavigate();

  React.useEffect(() => {
    signOut().then(() => navigate("/"));
  }, [signOut, navigate]);

  return <div className="p-4">Déconnexion…</div>;
}

const renderLandingPage = () => {
  const go = (to: string) => navigate(`/sign-in?to=${encodeURIComponent(to)}`);

  return (
    <>
      {/* HERO + 3 cartes */}
      <section className="w-full py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-3">
              Arrêtez la fraude. Accélérez les soins.
            </h1>
            <p className="text-lg md:text-xl text-gray-600">
              Biométrie, vérification d’assurance en temps réel, dossier patient &amp; facturation —
              pour cliniques, assureurs et pharmacies.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm">-30% fraude</span>
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm">2× plus vite à l’accueil</span>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm">Moins d’impayés</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* ÉTABLISSEMENT */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-center mb-6">
                <Building className="h-10 w-10 text-indigo-600 mr-3" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Espace Établissement</h2>
                  <p className="text-gray-600">Accédez à votre interface professionnelle</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={() => go("/multispecialist/secretary/patients")} className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg">Secrétaire</button>
                <button onClick={() => go("/doctor/patients")} className="w-full bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg border">Médecin</button>
                <button onClick={() => go("/assureur/reports")} className="w-full bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg border">Assureur</button>
                <button onClick={() => go("/pharmacy")} className="w-full bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg border">Pharmacie</button>
              </div>
              <p className="text-xs text-gray-500 mt-3">Après connexion, vous serez redirigé vers l’espace sélectionné.</p>
            </div>

            {/* PATIENT */}
            <div className="bg-gradient-to-br from-emerald-600 to-sky-600 rounded-2xl shadow-xl p-8 text-white">
              <div className="flex items-center justify-center mb-6">
                <User className="h-10 w-10 mr-3" />
                <div>
                  <h2 className="text-2xl font-bold">Espace Patient</h2>
                  <p className="text-emerald-100">Accédez à vos consultations</p>
                </div>
              </div>
              <button onClick={() => navigate("/patient/login")} className="w-full px-4 py-2 bg-white text-emerald-700 rounded-lg hover:bg-emerald-100 transition">
                Accéder à mon espace patient
              </button>
            </div>

            {/* DÉVELOPPEUR */}
            <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl shadow-xl p-8 text-white">
              <div className="flex items-center justify-center mb-6">
                <Code className="h-10 w-10 mr-3" />
                <div>
                  <h2 className="text-2xl font-bold">Espace Développeur</h2>
                  <p className="text-indigo-100">Sandbox de démonstration</p>
                </div>
              </div>
              <button onClick={() => go("/assureur/reports")} className="w-full px-4 py-2 bg-white text-indigo-700 rounded-lg hover:bg-indigo-100 transition">
                Ouvrir la démo (Assureur)
              </button>
              <p className="text-xs text-indigo-100 mt-3 opacity-90">Utilise Clerk en mode dev — aucun risque pour vos données.</p>
            </div>
          </div>
        </div>
      </section>

      {/* BÉNÉFICES — cartes alignées et centrées */}
      <section className="w-full py-6">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-6">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Pour cliniques & cabinets</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2"> - <span className="mt-1"></span> Enregistrement 2× plus rapide à l’accueil</li>
              <li className="flex items-start gap-2"> - <span className="mt-1"></span> Dossier patient unifié (consultations, ordonnances, factures)</li>
              <li className="flex items-start gap-2"> - <span className="mt-1"></span> Moins d’impayés grâce à la vérification d’assurance</li>
            </ul>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Pour assureurs</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2"> - <span className="mt-1"></span> Anti-fraude biométrique à l’acte</li>
              <li className="flex items-start gap-2"> - <span className="mt-1"></span> Éligibilité en temps réel (droits, plafond, plan)</li>
              <li className="flex items-start gap-2"> - <span className="mt-1"></span> Traçabilité & rapports détaillés</li>
            </ul>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold mb-3">Pour pharmacies</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2"> - <span className="mt-1"></span> Validation ordonnance & historique patient</li>
              <li className="flex items-start gap-2"> - <span className="mt-1"></span> Remboursement accéléré (moins de litiges)</li>
              <li className="flex items-start gap-2"> - <span className="mt-1"></span> Intégration simple avec le stock</li>
            </ul>
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section className="w-full py-6">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-2xl font-bold mb-4 text-center">Comment ça marche ?</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="text-indigo-600 font-bold">1</div>
              <p className="mt-2 text-gray-900 font-medium">Enregistrement & identité</p>
              <p className="text-gray-600 text-sm">Secrétaire ou patient crée le profil. Option biométrie (empreinte) selon la clinique.</p>
            </div>
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="text-indigo-600 font-bold">2</div>
              <p className="mt-2 text-gray-900 font-medium">Vérification assurance</p>
              <p className="text-gray-600 text-sm">Contrôle des droits en temps réel : contrat, plan, plafond, co-pay.</p>
            </div>
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="text-indigo-600 font-bold">3</div>
              <p className="mt-2 text-gray-900 font-medium">Soin & facturation</p>
              <p className="text-gray-600 text-sm">Consultation, ordonnance, délivrance en officine, facture & suivi paiement.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SÉCURITÉ */}
      <section className="w-full py-6">
        <div className="max-w-7xl mx-auto px-4 rounded-2xl bg-gray-50 p-6 border">
          <h3 className="text-2xl font-bold mb-3 text-center">Sécurité & conformité</h3>
          <div className="grid md:grid-cols-4 gap-4 text-sm">
            <div className="rounded-lg bg-white p-4 border">Chiffrement en transit & au repos (HTTPS/TLS, AES-256)</div>
            <div className="rounded-lg bg-white p-4 border">Rôles & autorisations granulaires </div>
            <div className="rounded-lg bg-white p-4 border">Journalisation des accès & preuves anti-fraude</div>
            <div className="rounded-lg bg-white p-4 border">Conforme RGPD / consentement patient</div>
          </div>
          <p className="mt-3 text-gray-600 text-sm text-center">
            Les données biométriques sont <b>hachées/templatisées</b> et sécurisés.
          </p>
        </div>
      </section>

      {/* CTA FINAL */}
{/* CTA FINAL */}
<section className="w-full py-10">
  <div className="max-w-7xl mx-auto px-4">
    <div className="rounded-2xl bg-indigo-600 text-white p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
      <div>
        <h3 className="text-xl font-semibold">Prêt à tester ?</h3>
        <p className="opacity-90">
          Enregistrez-vous afin de participer à la phase pilote en <b>MARS 2026</b>.
        </p>
      </div>

        {/* Boutons */}
        <div className="flex gap-3">
          {(() => {
            const whatsappNumber = "0033782525687"; // ← mets ton numéro ici (format international, sans + ni espaces)
            const defaultMsg =
              "Bonjour, je souhaite rejoindre la phase pilote MediConnect+ (Mars 2026). " +
              "Nom: ____ | Structure: ____ | Rôle: (clinique/cabinet/assureur/pharmacie) | Ville: ____ | Pays: ____ ";
            const whatsappHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(defaultMsg)}`;
            return (
              <>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-white text-indigo-700"
                >
                  Demandez à participer
                </a>

                <a
                  href="/a-propos#pilot"  // ou une vraie page de détails si tu en as une
                  className="px-4 py-2 rounded-lg border border-white/70 text-white hover:bg-white/10"
                >
                  En savoir plus
                </a>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  </section>
    </>
  );
};


  return (
    <>
    <GlobalHeader />
  <Routes>
    {/* PUBLIC */}
    <Route path="/" element={renderLandingPage()} />
    <Route path="/unauthorized" element={<Unauthorized />} />
    <Route path="/sign-out" element={<SignOutPage />} />
    <Route path="/debug/reset" element={<DebugReset />} />

    {/* Clerk auth */}
    <Route path="/sign-in/*" element={<SignInPage />} />
    <Route path="/sign-up/*" element={<SignUp routing="path" path="/sign-up" />} />

    {/* Redirection post-login selon le rôle */}
    <Route path="/role-redirect" element={<RoleRedirect />} />

    {/* DOCTOR */}
    <Route
      path="/doctor/*"
      element={
        <PrivateRouteByRole allowedRole="doctor">
          <DoctorLayout/>
        </PrivateRouteByRole>
      }
    >
      <Route index element={<DashboardPage />} />
      <Route path="patients" element={<PatientsPage />} />
      <Route path="patients/new" element={<NewPatientPage />} />
      <Route path="new-act" element={<NewActPage />} />
      <Route path="consultation-follow-up" element={<ConsultationFollowUpPage />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="performance" element={<PerformancePage />} />
    </Route>

    {/* ASSUREUR */}
    <Route
      path="/assureur/*"
      element={
        <PrivateRouteByRole allowedRole="assurer">
          <AssureurLayout />
        </PrivateRouteByRole>
      }
    >
      <Route path="reports" element={<AssureurReports />} />
      <Route path="anomalies" element={<AssureurAnomalies />} />
      <Route path="fingerprint-alerts" element={<FingerprintAlertsPage />} />
      <Route path="paiements" element={<AssureurPaiements />} />
      <Route path="cliniques" element={<CliniquesPage />} />
      <Route path="statistiques" element={<StatistiquesPage />} />
    </Route>

    {/* MULTISPECIALIST DOCTOR */}
    <Route
      path="/multispecialist/doctor/*"
      element={
        <PrivateRouteByRole allowedRole="doctor">
          <MultispecialistDoctorLayout />
        </PrivateRouteByRole>
      }
    >
      <Route index element={<DoctorDashboardPage />} />
      <Route path="patients" element={<DoctorPatientsPage />} />
      <Route path="new-consultation" element={<NewConsultationPage />} />
      <Route path="consultation-follow-up" element={<ConsultationDoctorFollowUpPage />} />
      <Route path="performance" element={<PerformanceDoctorPage />} />
      <Route path="settings" element={<SettingsDoctorPage />} />
      <Route path="patient/:id" element={<DoctorPatientDetailsPage />} />
    </Route>

    {/* MULTISPECIALIST ADMIN */}
    <Route
      path="/multispecialist/admin/*"
      element={
        <PrivateRouteByRole allowedRole="admin">
          <MultispecialistAdminLayout />
        </PrivateRouteByRole>
      }
    >
      <Route path="dashboard" element={<AdminDashboardPage />} />
      <Route path="performance" element={<PerformanceAdminPage />} />
      <Route path="team" element={<ManageTeamPage />} />
      <Route path="statistics" element={<StatisticsPage />} />
      <Route path="permissions" element={<PermissionsPage />} />
      <Route path="patients" element={<PatientsAdminPage />} />
      <Route path="alerts" element={<AlertsPage />} />
      <Route path="payments" element={<PaymentsPage />} />
      <Route path="payment-logs" element={<PaymentLogsPage />} />
      <Route path="support-inbox" element={<SupportInboxPage />} />
    </Route>

    {/* SECRETARY (avec ClerkGuard si tu veux conserver) */}
    <Route
      path="/multispecialist/secretary/*"
      element={
        <ClerkGuard>
          <PrivateRouteByRole allowedRole="secretary">
            <MultispecialistSecretaryLayout />
          </PrivateRouteByRole>
        </ClerkGuard>
      }
    >
      <Route index element={<SecretaryPatientsPage />} />
      <Route path="patients" element={<SecretaryPatientsPage />} />
      <Route path="new" element={<NewPatientWizard />} />
      <Route path="support" element={<SupportPage />} />
    </Route>

    {/* PHARMACY */}
    <Route
      path="/pharmacy/*"
      element={
        <PrivateRouteByRole allowedRole="pharmacist">
          <PharmacyLayout />
        </PrivateRouteByRole>
      }
    >
      <Route index element={<PharmacyDashboard />} />
      <Route path="orders" element={<PharmacyOrders />} />
      <Route path="history" element={<PharmacyHistory />} />
      <Route path="settings" element={<PharmacySettings />} />
    </Route>

    <Route path="/fp-callback" element={<FingerprintCallback />} />

    <Route path="*" element={<Navigate to="/" />} />
  </Routes>
  <SiteFooter />
  </>
);
}
