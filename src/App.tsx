// src/App.tsx
import { Routes, Route, Navigate, useNavigate, Outlet } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { useClerk } from "@clerk/clerk-react";
import { useState, useEffect } from 'react';
import { useUser, SignIn, SignUp } from '@clerk/clerk-react';
import ClerkGuard from "./components/auth/ClerkGuard";
import { loginEstablishment, type EstablishmentUser } from './lib/auth';
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
import RedirectByRolePage from "./Pages/RedirectByRolePage";
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


export default function App() {
  const { isLoaded } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('doctor');
  const [error, setError] = useState<string | null>(null);

  const [establishmentUser, setEstablishmentUser] = useState<EstablishmentUser | null>(() => {
    try {
      const raw = localStorage.getItem("establishmentUserSession");
      if (raw) {
        const s = JSON.parse(raw);
        // expect FLAT shape
        if (s?.role && s?.id) {
          const maxAge = 60 * 60 * 1000; // 1h
          if (Date.now() - (s.timestamp ?? 0) < maxAge) {
            return s as EstablishmentUser;
          }
        }
        localStorage.removeItem("establishmentUserSession");
      }

      const rawPharma = localStorage.getItem("pharmacyUserSession");
      if (rawPharma) {
        const p = JSON.parse(rawPharma);
        if (p?.role === "pharmacist") return p as EstablishmentUser;
        localStorage.removeItem("pharmacyUserSession");
      }
    } catch (e) {
      console.warn("[Session] parse error:", e);
    }
    return null;
  });

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

    useEffect(() => {
      if (establishmentUser) {
        const flat = { ...establishmentUser, timestamp: Date.now() }; // FLAT
        localStorage.setItem("establishmentUserSession", JSON.stringify(flat));
        if (flat.role === "pharmacist") {
          localStorage.setItem("pharmacyUserSession", JSON.stringify(flat));
        } else {
          localStorage.removeItem("pharmacyUserSession");
        }
      } else {
        localStorage.removeItem("establishmentUserSession");
        localStorage.removeItem("pharmacyUserSession");
      }
    }, [establishmentUser]);

    const handleEstablishmentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      console.log("🔐 Tentative de connexion :", email);
      localStorage.setItem("userEmail", email);

      const staff = await loginEstablishment(email, role, password);
      if (!staff) {
        setError("Échec de la connexion. Veuillez vérifier les informations.");
        return;
      }

        // normalize & save FLAT
        const flat: EstablishmentUser = {
          id: staff.id,
          name: staff.name,
          role: staff.role,           // "admin" | "doctor" | "assurer" | "secretary" | "pharmacist"
          email: staff.email,
          clinicId: staff.clinicId,
          clinicName: staff.clinicName,
        };
        setEstablishmentUser(flat); // triggers the useEffect above
        localStorage.setItem("establishmentUserSession", JSON.stringify({ ...flat, timestamp: Date.now() }));
        if (flat.role === "pharmacist") {
          localStorage.setItem("pharmacyUserSession", JSON.stringify({ ...flat, timestamp: Date.now() }));
        }

        // redirect by role
        switch (flat.role) {
          case "secretary":
            navigate("/multispecialist/secretary/patients"); break;
          case "doctor":
            navigate("/doctor/patients"); break;
          case "assurer":
            navigate("/assureur/reports"); break;
          case "admin":
            navigate("/multispecialist/admin/dashboard"); break;
          case "pharmacist":
            navigate("/pharmacy"); break;
          default:
            navigate("/unauthorized");
        }
            } catch (err) {
              setError("Une erreur est survenue lors de la connexion.");
              console.error(err);
            }
            };

  const handleLogout = () => {
    localStorage.removeItem('establishmentUserSession');
    localStorage.removeItem('pharmacyUserSession');
    attachClerkToken(null);
    setEstablishmentUser(null);
    navigate('/');
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        Chargement...
      </div>
    );
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
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}
          <form onSubmit={handleEstablishmentLogin} className="space-y-6">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="doctor">Médecin</option>
              <option value="admin">Administrateur</option>
              <option value="secretary">Secrétaire</option>
              <option value="assurer">Assureur</option>
              <option value="pharmacist">Pharmacie</option>
            </select>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
            <button type="submit" className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg">Se connecter</button>
          </form>
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
      onClick={() => openSignIn({ redirectUrl: "/multispecialist/secretary/patients" })}
      className="w-full px-4 py-2 bg-white text-indigo-700 rounded-lg hover:bg-indigo-100 transition"
    >
      Se connecter avec Clerk
    </button>
        </div>
      </div>
    </div>
  );

  return (
  <Routes>
  {/* PUBLIC */}
  <Route path="/" element={renderLandingPage()} />
  <Route path="/unauthorized" element={<Unauthorized />} />

  {/* Clerk auth : 1 seule route, SANS forceRedirectUrl */}
  <Route
    path="/sign-in/*"
    element={
      <SignIn routing="path" path="/sign-in" fallbackRedirectUrl="/" />
    }
  />
  <Route path="/sign-up/*" element={<SignUp routing="path" path="/sign-up" />} />

  {/* DOCTOR — sans ClerkGuard */}
  <Route
    path="/doctor/*"
    element={
      <PrivateRouteByRole allowedRole="doctor" establishmentUser={establishmentUser}>
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

  {/* ASSUREUR — sans ClerkGuard */}
  <Route
    path="/assureur/*"
    element={
      <PrivateRouteByRole allowedRole="assurer" establishmentUser={establishmentUser}>
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

  {/* MULTISPECIALIST DOCTOR — sans ClerkGuard */}
  <Route
    path="/multispecialist/doctor/*"
    element={
      <PrivateRouteByRole allowedRole="doctor" establishmentUser={establishmentUser}>
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

  {/* MULTISPECIALIST ADMIN — sans ClerkGuard */}
  <Route
    path="/multispecialist/admin/*"
    element={
      <PrivateRouteByRole allowedRole="admin" establishmentUser={establishmentUser}>
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

  {/* MULTISPECIALIST SECRETARY — le SEUL espace avec ClerkGuard */}
  <Route
    path="/multispecialist/secretary/*"
    element={
      <ClerkGuard>
        <PrivateRouteByRole allowedRole="secretary" establishmentUser={establishmentUser}>
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

  {/* PHARMACY — sans ClerkGuard */}
  <Route
    path="/pharmacy/*"
    element={
      <PrivateRouteByRole allowedRole="pharmacist" establishmentUser={establishmentUser}>
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
  
);
};
function openSignIn(arg0: { redirectUrl: string; }): void {
  throw new Error('Function not implemented.');
}

