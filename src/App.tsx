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

function GlobalHeader() {
  const { user } = useUser();
  return (
    <header className="w-full flex items-center justify-between px-4 py-2 border-b bg-white">
      <Link to="/" className="font-semibold">MediConnect+</Link>

      <div className="flex items-center gap-3">
        <SignedIn>
          <span className="text-sm text-gray-600">
            {user?.primaryEmailAddress?.emailAddress} — rôle : {String(user?.publicMetadata?.role)}
          </span>
          {/* Ouvre un menu avec Switch account / Sign out */}
          <UserButton afterSignOutUrl="/" />
        </SignedIn>

        <SignedOut>
          <Link to="/sign-in" className="text-indigo-600 underline">
            Se connecter
          </Link>
        </SignedOut>
      </div>
    </header>
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

  const renderLandingPage = () => (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent mb-4">MediConnect+</h1>
        <p className="text-xl text-gray-600">La solution complète pour la gestion de votre établissement de santé</p>
      </div>
      <div className="w-full max-w-6xl grid md:grid-cols-3 gap-8">

      {/* Espace établissement */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-center mb-6">
          <Building className="h-10 w-10 text-indigo-600 mr-3" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Espace Établissement</h2>
            <p className="text-gray-600">Accédez à votre interface professionnelle</p>
          </div>
        </div>

        <button
          onClick={() => navigate("/sign-in")}
          className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg"
        >
          Se connecter (Clerk)
        </button>

        <p className="text-xs text-gray-500 mt-3">
          Après connexion vous serez redirigé automatiquement selon votre rôle.
        </p>
      </div>

        {/* Espace patient */}
        <div className="bg-gradient-to-br from-emerald-600 to-sky-600 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex items-center justify-center mb-6">
            <User className="h-10 w-10 mr-3" />
            <div>
              <h2 className="text-2xl font-bold">Espace Patient</h2>
              <p className="text-emerald-100">Accédez à vos consultations</p>
            </div>
          </div>
        <button
          onClick={() => navigate("/patient/login")}
          className="w-full px-4 py-2 bg-white text-emerald-600 rounded-lg hover:bg-emerald-100 transition">
          Accéder à mon espace patient
          </button>
        </div>

{/* Espace développeur */}
<div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl shadow-xl p-8 text-white">
  <div className="flex items-center justify-center mb-6">
    <Code className="h-10 w-10 mr-3" />
    <div>
      <h2 className="text-2xl font-bold">Espace Développeur</h2>
      <p className="text-indigo-100">Commencez à utiliser MediConnect+</p>
    </div>
  </div>
    <button
      onClick={() => navigate("/sign-in")}
      className="w-full px-4 py-2 bg-white text-indigo-700 rounded-lg hover:bg-indigo-100 transition"
    >
      Se connecter
    </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
    <GlobalHeader />
  <Routes>
    {/* PUBLIC */}
    <Route path="/" element={renderLandingPage()} />
    <Route path="/unauthorized" element={<Unauthorized />} />

    {/* Clerk auth */}
    <Route
      path="/sign-in/*"
      element={<SignIn routing="path" path="/sign-in" afterSignInUrl="/role-redirect" />}
    />
    <Route path="/sign-up/*" element={<SignUp routing="path" path="/sign-up" />} />
    <Route
      path="/sign-out"
      element={<SignOutPage />}
    />

    {/* Redirection post-login selon le rôle */}
    <Route path="/role-redirect" element={<RoleRedirect />} />

    {/* DOCTOR */}
    <Route
      path="/doctor/*"
      element={
        <PrivateRouteByRole allowedRole="doctor">
          <DoctorLayout><Outlet /></DoctorLayout>
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
      <Route path="dashboard" element={<DoctorDashboardPage />} />
      <Route path="patients" element={<DoctorPatientsPage />} />
      <Route path="new-consultation" element={<NewConsultationPage />} />
      <Route path="DoctorPatientsPage/new" element={<NewPatientDoctorPage />} />
      <Route path="consultation-follow-up" element={<ConsultationDoctorFollowUpPage />} />
      <Route path="settings" element={<SettingsDoctorPage />} />
      <Route path="performance" element={<PerformanceDoctorPage />} />
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
  </>
);

function openSignIn(arg0: { redirectUrl: string; }): void {
  throw new Error('Function not implemented.');
}
};


