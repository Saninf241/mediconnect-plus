// src/App.tsx
import { Routes, Route, Navigate, useNavigate, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useUser, SignIn, SignUp } from '@clerk/clerk-react';
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
import AdminDashboardPage  from './Pages/multispecialist/admin/AdminDashboardPage';
import ManageTeamPage  from './Pages/multispecialist/admin/ManageTeamPage';
import SecretaryPatientsPage  from './Pages/multispecialist/secretary/SecretaryPatientsPage'; 
import SupportPage from './Pages/multispecialist/secretary/SupportPage';
import RedirectByRolePage from "./Pages/RedirectByRolePage";
import PrivateRouteByRole from "./components/auth/PrivateRouteByRole";
import Unauthorized from './Pages/Unauthorized';
import NewPatientDoctorPage from './Pages/multispecialist/doctor/NewPatientDoctorPage';
import ConsultationDoctorFollowUpPage from './Pages/multispecialist/doctor/ConsultationDoctorFollowUpPage';
import SettingsDoctorPage from './Pages/multispecialist/doctor/SettingsDoctorPage';
import PerformanceDoctorPage from './Pages/multispecialist/doctor/PerformanceDoctorPage';

export default function App() {
  const { isLoaded } = useUser();
  const navigate = useNavigate();

  const [establishmentUser, setEstablishmentUser] = useState<EstablishmentUser | null>(() => {
    const sessionRaw = localStorage.getItem('establishmentUserSession');
    console.log("[DoctorLayout] Contenu localStorage:", sessionRaw);
    if (!sessionRaw) return null;

    try {
      const session = JSON.parse(sessionRaw);
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      if (now - session.timestamp > oneHour) {
        console.warn('[Session] Session expirée. Nettoyage du stockage local.');
        localStorage.removeItem('establishmentUserSession');
        return null;
      }

      return session.user as EstablishmentUser;
    } catch {
      return null;
    }
  });

  useEffect(() => {
  localStorage.removeItem("establishmentUserSession");
  localStorage.removeItem("userEmail");
}, []);

  // Removed unused establishmentName state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('doctor');
  const [error, setError] = useState<string | null>(null);
  const [showPatientPortal, setShowPatientPortal] = useState(false);

  useEffect(() => {
    if (establishmentUser) {
      const session = {
        user: establishmentUser,
        timestamp: Date.now()
      };
      localStorage.setItem('establishmentUserSession', JSON.stringify(session));
    } else {
      localStorage.removeItem('establishmentUserSession');
    }
  }, [establishmentUser]);

    useEffect(() => {
      if (establishmentUser) {
        switch (establishmentUser.role) {
          case "doctor":
            navigate("/doctor");
            break;
          case "admin":
            navigate("/multispecialist/admin");
            break;
          case "secretary":
            navigate("/multispecialist/secretary");
            break;
          case "assurer":
            navigate("/assureur");
            break;
          default:
            setError("Rôle non pris en charge.");
        }
      }
    }, [establishmentUser]);

    const handleEstablishmentLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      try {
        console.log("🔐 Tentative connexion pour :", email);
        localStorage.setItem("userEmail", email);

        const user = await loginEstablishment(email, role, password);
        if (!user) {
          setError("Échec de la connexion. Veuillez vérifier les informations.");
          return;
        }

        const session = {
          user,
          timestamp: Date.now(),
        };

        localStorage.setItem("establishmentUserSession", JSON.stringify(session));
        setEstablishmentUser(user); // Redirection gérée ensuite par useEffect

      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors de la connexion.");
      }
    };

  const handleLogout = () => {
  localStorage.removeItem('establishmentUserSession');
  setEstablishmentUser(null);
  navigate('/');
 };

if (!isLoaded) {
  return <div className="flex items-center justify-center h-screen">Chargement...</div>;
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
          <button onClick={() => setShowPatientPortal(true)} className="w-full px-4 py-2 bg-white text-emerald-600 rounded-lg">Accéder à mon espace</button>
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
          <SignIn />
        </div>
      </div>

      {/* Portail patient */}
      {showPatientPortal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            {/* À compléter plus tard */}
            <button onClick={() => setShowPatientPortal(false)} className="mt-4 w-full bg-red-500 text-white py-2 rounded-lg">Fermer</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
  <Routes>
    {/* ROUTES PUBLIQUES (PAS DE Clerk requis) */}
    <Route path="/" element={renderLandingPage()} />
    <Route path="/sign-in" element={<SignIn routing="path" path="/sign-in" redirectUrl="/redirect" />} />
    <Route path="/sign-up" element={<SignUp routing="path" path="/sign-up" />} />
    <Route path="/unauthorized" element={<Unauthorized />} />

    {/* REDIRECTION POST-CONNEXION */}
    <Route path="/redirect" element={<RedirectByRolePage />} />

    {/* ROUTES PROTÉGÉES */}
    <Route
  path="/doctor/*"
  element={
    <PrivateRouteByRole allowedRole="doctor" establishmentUser={establishmentUser}>
      <DoctorLayout>
        <Outlet />
      </DoctorLayout>
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

    <Route
      path="/assureur/*"
      element={
        <PrivateRouteByRole allowedRole="assurer" establishmentUser={establishmentUser}>
          <AssureurLayout />
        </PrivateRouteByRole>
      }
    />

    {/* MULTISPECIALIST ROLES */}
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

    <Route
      path="/multispecialist/admin/*"
      element={
        <PrivateRouteByRole allowedRole="admin" establishmentUser={establishmentUser}>
          <MultispecialistAdminLayout />
        </PrivateRouteByRole>
      }
    >

      <Route path="dashboard" element={<AdminDashboardPage />} />
      <Route path="performance" element={<PerformancePage />} />
      <Route path="team" element={<ManageTeamPage />} />
    </Route>

    <Route
      path="/multispecialist/secretary/*"
      element={
        <PrivateRouteByRole allowedRole="secretary" establishmentUser={establishmentUser}>
          <MultispecialistSecretaryLayout />
        </PrivateRouteByRole>
      }
    >
      <Route path="patients" element={<SecretaryPatientsPage />} />
      <Route path="support" element={<SupportPage />} />
    </Route>

    {/* CATCH-ALL → redirection vers la page d’accueil */}
    <Route path="*" element={<Navigate to="/" />} />
  </Routes>
);

}
