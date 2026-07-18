// src/App.tsx
import { Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { SignUp } from '@clerk/clerk-react';
import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/clerk-react";
import DoctorLayout from './components/layouts/DoctorLayout';
import AssureurLayout from './components/layouts/AssureurLayout';
import DashboardPage from './Pages/doctor/DashboardPage';
import { Building, Code, User, CheckCircle2, TrendingUp, ShieldCheck, Building2, Lock, KeyRound, ScrollText, Scale, UserCheck, Fingerprint, FileCheck2, Stethoscope, Inbox, ClipboardCheck, Wallet } from 'lucide-react';
import PerformancePage from './Pages/doctor/PerformancePage';
import MultispecialistDoctorLayout from './components/layouts/MultispecialistDoctorLayout';
import MultispecialistAdminLayout from './components/layouts/MultispecialistAdminLayout';
import MultispecialistSecretaryLayout from './components/layouts/MultispecialistSecretaryLayout';
import SpecialistSecretaryLayout from './components/layouts/SpecialistSecretaryLayout';
import DoctorDashboardPage from './Pages/multispecialist/doctor/DoctorDashboardPage';
import SecretaryPatientsPage  from './Pages/multispecialist/secretary/SecretaryPatientsPage';
import NewPatientWizard from './Pages/multispecialist/secretary/NewPatientWizard';
import SupportPage from './Pages/multispecialist/secretary/SupportPage';
import DoctorSupportPage from './Pages/doctor/SupportPage';
import MultiDoctorSupportPage from './Pages/multispecialist/doctor/SupportPage';
import AssureurSupportPage from './Pages/assureur/SupportPage';
import PrivateRouteByArea from "./components/auth/PrivateRouteByArea";
import Unauthorized from './Pages/Unauthorized';
import PerformanceDoctorPage from './Pages/multispecialist/doctor/PerformanceDoctorPage';
// Pages partagées entre cabinet spécialiste solo (/doctor/*) et multi-spécialiste (/multispecialist/doctor/*)
import PatientDetailsPage from './Pages/shared/doctor/PatientDetailsPage';
import DoctorConsultationDetailsPage from './Pages/shared/doctor/ConsultationDetailsPage';
import NewConsultationPage from './Pages/shared/doctor/NewConsultationPage';
import SettingsPage from './Pages/shared/doctor/SettingsPage';
import HistoriqueActesPage from './Pages/shared/doctor/HistoriqueActesPage';
import PatientsPage from './Pages/shared/doctor/PatientsPage';
import NewPatientPage from './Pages/shared/doctor/NewPatientPage';
import PharmacyLayout from "./components/layouts/PharmacyLayout";
import PharmacyDashboard from "./Pages/pharmacy/PharmacyDashboard";
import PharmacyOrders from "./Pages/pharmacy/Orders";
import PharmacyHistory from "./Pages/pharmacy/History";
import PharmacySettings from "./Pages/pharmacy/Settings";
import AssureurReports from './Pages/assureur/AssureurReports';
import AssureurAnomalies from './Pages/assureur/AssureurAnomalies';
import FingerprintAlertsPage from './Pages/assureur/FingerprintAlertsPage';
import AssureurPaiements from './Pages/assureur/PaiementsPage';
import StatistiquesPage from './Pages/assureur/StatistiquesPage';
import CliniquesPage from './Pages/assureur/CliniquesPage';
import ConsultationDetailsPage from './Pages/assureur/ConsultationDetailsPage';
import MembersDirectoryPage from './Pages/assureur/MembersDirectoryPage';
import AssureurSettingsPage from './Pages/assureur/AssureurSettingsPage';
import AdminDashboardPage from "./Pages/multispecialist/admin/AdminDashboardPage";
import AdminConsultationsPage from "./Pages/multispecialist/admin/AdminConsultationsPage";
import AdminPerformancePage from "./Pages/multispecialist/admin/AdminPerformancePage";
import AdminPaymentsPage from './Pages/multispecialist/admin/AdminPaymentsPage';
import AdminAlertsPage from './Pages/multispecialist/admin/AdminAlertsPage';
import AdminPatientsPage from './Pages/multispecialist/admin/AdminPatientsPage';
import AdminTeamPage from './Pages/multispecialist/admin/AdminTeamPage';
import AdminSupportInboxPage from './Pages/multispecialist/admin/AdminSupportInboxPage';
import AdminSettingsPage from './Pages/multispecialist/admin/AdminSettingsPage';
import { useAuth } from "@clerk/clerk-react";
import { attachClerkToken } from "./lib/supabase";
import FingerprintCallback from "./Pages/FingerprintCallback";
import RoleRedirect from "./components/auth/RoleRedirect";
import SignInPage from "./components/auth/SignInPage";
import PatientPrivateRoute from "./components/auth/PatientPrivateRoute";
import PatientLayout from "./components/layouts/PatientLayout";
import PatientLoginPage from "./Pages/patient/Login";
import PatientDashboard from "./Pages/patient/Dashboard";
import PatientIdentite from "./Pages/patient/Identite";
import PatientConsultations from "./Pages/patient/Consultations";
import PatientOrdonnances from "./Pages/patient/Ordonnances";
import PatientTraitements from "./Pages/patient/Traitements";
import PatientPharmacie from "./Pages/patient/Pharmacie";
import PatientRemboursements from "./Pages/patient/Remboursements";
import PatientSettings from "./Pages/patient/Settings";
import { useLocation } from "react-router-dom";
import { Facebook, Linkedin, Mail, MessageCircle } from "lucide-react";
import DebugReset from './Pages/DebugReset';
import RequireDeveloper from "./components/auth/RequireDeveloper";
import DeveloperLayout from "./components/layouts/DeveloperLayout";
import DeveloperHome from "./Pages/developer/DeveloperHome";
import NewClinicPage from "./Pages/developer/NewClinicPage";
import NewInsurerPage from "./Pages/developer/NewInsurerPage";
import TicketsPage from "./Pages/developer/TicketsPage";
import ManageOrgsPage from "./Pages/developer/ManageOrgsPage";
import MentionsLegales from "./Pages/legal/MentionsLegales";
import Confidentialite from "./Pages/legal/Confidentialite";
import ScrollToTop from "./components/ScrollToTop";

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
  const socialLinks = (
    <div className="flex items-center gap-4">
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
        href="https://wa.me/0033782525687?text=Je%20souhaite%20en%20savoir%20plus%20sur%20MediConnect%2B"
        target="_blank" rel="noreferrer"
        aria-label="WhatsApp"
        className="text-gray-500 hover:text-indigo-600"
        title="WhatsApp"
      >
        <MessageCircle className="h-5 w-5" />
      </a>

      <a
        href="mailto:contact@ndoungconsulting.com?subject=Demande%20d%27information%20MediConnect%2B"
        className="text-gray-500 hover:text-indigo-600"
        aria-label="Email"
        title="Email"
      >
        <Mail className="h-5 w-5" />
      </a>
    </div>
  );

  return (
    <footer className="mt-16 border-t bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-lg font-bold text-gray-900">MediConnect+</p>
          <p className="mt-2 text-sm text-gray-600">
            Biométrie anti-fraude, vérification d'assurance en temps réel et
            dossier patient unifié pour cliniques, assureurs et courtiers.
          </p>
          <div className="mt-4">{socialLinks}</div>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900 mb-3">Solutions</p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><a href="/#comment-ca-marche" className="hover:text-indigo-600">Comment ça marche</a></li>
            <li><a href="/#securite" className="hover:text-indigo-600">Sécurité & conformité</a></li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900 mb-3">Espaces</p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><a href="/#benefices" className="hover:text-indigo-600">Assureurs & courtiers</a></li>
            <li><a href="/#benefices" className="hover:text-indigo-600">Cliniques & cabinets</a></li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold text-gray-900 mb-3">Légal</p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li><Link to="/mentions-legales" className="hover:text-indigo-600">Mentions légales</Link></li>
            <li><Link to="/politique-confidentialite" className="hover:text-indigo-600">Politique de confidentialité</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} MediConnect+ — SANINF SARLU, SARLU au capital de 200 000 FCFA, Gabon
          </p>
        </div>
      </div>
    </footer>
  );
}


export default function App() {
  const { isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
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

  const renderLandingPage = () => {
  const go = (to: string) => navigate(`/sign-in?to=${encodeURIComponent(to)}`);

  return (
    <>
      {/* HERO + 3 cartes */}
      <section className="w-full py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-3">
              Stoppez la fraude à l’acte.<br className="hidden sm:block" />{" "}
              Remboursez dès réception d’un dossier vérifié.
            </h1>
            <p className="text-lg md:text-xl text-gray-600">
              Biométrie anti-fraude, vérification d’assurance instantanée et dossier patient unifié —
              pour assureurs, courtiers, cliniques et cabinets.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm">Vérification à chaque acte</span>
              <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm">Vérification d’assurance en quelques secondes</span>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm">Moins d’impayés</span>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Jusqu’à 10 % des dépenses de santé sont perdues à la fraude dans le monde —{" "}
              <a
                href="https://www.nhcaa.org/tools-insights/about-health-care-fraud/the-challenge-of-health-care-fraud/"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-gray-700"
              >
                source : NHCAA
              </a>.
            </p>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button onClick={() => go("/multispecialist/secretary/patients")} className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg">Secrétaire</button>
                <button onClick={() => go("/doctor/patients")} className="w-full bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg border">Médecin</button>
                <button onClick={() => go("/assureur/reports")} className="w-full bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg border">Assureur</button>
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
                  <p className="text-indigo-100">Création de cabinets, cliniques et assureurs</p>
                </div>
              </div>
              <button onClick={() => go("/developer")} className="w-full px-4 py-2 bg-white text-indigo-700 rounded-lg hover:bg-indigo-100 transition">
                Accéder à l’espace développeur
              </button>
              <p className="text-xs text-indigo-100 mt-3 opacity-90">Réservé aux comptes avec le rôle développeur.</p>
            </div>
          </div>
        </div>
      </section>

      {/* BÉNÉFICES — cartes alignées et centrées */}
      <section id="benefices" className="w-full py-6 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-6">
          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                <TrendingUp className="h-5 w-5" />
              </span>
              <h3 className="text-xl font-semibold">Pour assureurs & courtiers</h3>
            </div>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" /> Éligibilité en temps réel (droits, plafond, plan)</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" /> Remboursements accélérés, moins de litiges avec les assurés</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" /> Reporting consolidé multi-cliniques pour piloter le risque</li>
            </ul>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <h3 className="text-xl font-semibold">Anti-fraude</h3>
            </div>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" /> Anti-fraude biométrique à l’acte</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" /> Détection des doublons et des abus en temps réel</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" /> Traçabilité & preuves d’audit détaillées</li>
            </ul>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                <Building2 className="h-5 w-5" />
              </span>
              <h3 className="text-xl font-semibold">Pour cliniques & cabinets</h3>
            </div>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" /> Enregistrement 2× plus rapide à l’accueil</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" /> Dossier patient unifié (consultations, ordonnances, factures)</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" /> Moins d’impayés grâce à la vérification d’assurance</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" /> Plus besoin de se déplacer chez l’assureur : le dossier part automatiquement</li>
            </ul>
          </div>
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section id="comment-ca-marche" className="w-full py-6 scroll-mt-24">
        <div className="max-w-2xl mx-auto px-4">
          <h3 className="text-2xl font-bold mb-6 text-center">Comment ça marche ?</h3>
          <div className="space-y-3">
            <div className="rounded-xl border bg-white p-4 shadow-sm flex items-start gap-4">
              <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">1</div>
              <div>
                <p className="text-gray-900 font-medium flex items-center gap-2"><UserCheck className="h-4 w-4 text-indigo-600 shrink-0" /> Patient assuré</p>
                <p className="text-gray-600 text-sm">Le patient s’identifie comme assuré à l’accueil (secrétaire ou lui-même).</p>
              </div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm flex items-start gap-4">
              <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">2</div>
              <div>
                <p className="text-gray-900 font-medium flex items-center gap-2"><Fingerprint className="h-4 w-4 text-indigo-600 shrink-0" /> Biométrie</p>
                <p className="text-gray-600 text-sm">Vérification d’identité par empreinte digitale, pour confirmer que c’est bien la bonne personne.</p>
              </div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm flex items-start gap-4">
              <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">3</div>
              <div>
                <p className="text-gray-900 font-medium flex items-center gap-2"><FileCheck2 className="h-4 w-4 text-indigo-600 shrink-0" /> Vérification assurance</p>
                <p className="text-gray-600 text-sm">Contrôle en temps réel des droits : contrat, plan, plafond, co-paiement.</p>
              </div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm flex items-start gap-4">
              <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">4</div>
              <div>
                <p className="text-gray-900 font-medium flex items-center gap-2"><Stethoscope className="h-4 w-4 text-indigo-600 shrink-0" /> Soin</p>
                <p className="text-gray-600 text-sm">Consultation, ordonnance, actes réalisés par le médecin.</p>
              </div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm flex items-start gap-4">
              <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">5</div>
              <div>
                <p className="text-gray-900 font-medium flex items-center gap-2"><Inbox className="h-4 w-4 text-indigo-600 shrink-0" /> Réception documentation</p>
                <p className="text-gray-600 text-sm">L’assureur reçoit automatiquement le dossier de consultation, avec la preuve d’empreinte.</p>
              </div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm flex items-start gap-4">
              <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">6</div>
              <div>
                <p className="text-gray-900 font-medium flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-indigo-600 shrink-0" /> Vérification</p>
                <p className="text-gray-600 text-sm">L’assureur vérifie le dossier reçu avant de valider le remboursement.</p>
              </div>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm flex items-start gap-4">
              <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">7</div>
              <div>
                <p className="text-gray-900 font-medium flex items-center gap-2"><Wallet className="h-4 w-4 text-indigo-600 shrink-0" /> Remboursement</p>
                <p className="text-gray-600 text-sm">Dès que le dossier est vérifié, le remboursement part — sans déplacement ni paperasse.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SÉCURITÉ */}
      <section id="securite" className="w-full py-6 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-4 rounded-2xl bg-gray-50 p-6 border">
          <h3 className="text-2xl font-bold mb-3 text-center">Sécurité & conformité</h3>
          <div className="grid md:grid-cols-4 gap-4 text-sm">
            <div className="rounded-lg bg-white p-4 border flex items-start gap-2">
              <Lock className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
              Chiffrement en transit & au repos (HTTPS/TLS, AES-256)
            </div>
            <div className="rounded-lg bg-white p-4 border flex items-start gap-2">
              <KeyRound className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
              Rôles & autorisations granulaires
            </div>
            <div className="rounded-lg bg-white p-4 border flex items-start gap-2">
              <ScrollText className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
              Journalisation des accès & preuves anti-fraude
            </div>
            <div className="rounded-lg bg-white p-4 border flex items-start gap-2">
              <Scale className="h-5 w-5 text-gray-500 shrink-0 mt-0.5" />
              Loi gabonaise n°001/2011 & bonnes pratiques RGPD
            </div>
          </div>
          <p className="mt-3 text-gray-600 text-sm text-center">
            Les données biométriques sont <b>hachées/templatisées</b> et sécurisés.
          </p>
        </div>
      </section>

      {/* CTA FINAL */}
<section className="w-full py-10">
  <div className="max-w-7xl mx-auto px-4">
    <div className="rounded-2xl bg-indigo-600 text-white p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
      <div>
        <h3 className="text-xl font-semibold">Prêt à tester ?</h3>
        <p className="opacity-90">
          Rejoignez la phase pilote MediConnect+ et testez la vérification d’assurance en temps réel.
        </p>
      </div>

        {/* Boutons */}
        <div className="flex gap-3">
          {(() => {
            const whatsappNumber = "0033782525687"; // ← mets ton numéro ici (format international, sans + ni espaces)
            const defaultMsg =
              "Bonjour, je souhaite rejoindre la phase pilote MediConnect+. " +
              "Nom: ____ | Structure: ____ | Rôle: (clinique/cabinet/assureur/courtier) | Ville: ____ | Pays: ____ ";
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
                  href="#comment-ca-marche"
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
    <div className="min-h-screen flex flex-col">
    <ScrollToTop />
    {!isAppArea && <GlobalHeader />}
    <div className="flex-1 flex flex-col">
  <Routes>
    {/* PUBLIC */}
    <Route path="/" element={renderLandingPage()} />
    <Route path="/unauthorized" element={<Unauthorized />} />
    <Route path="/debug/reset" element={<DebugReset />} />
    <Route path="/mentions-legales" element={<MentionsLegales />} />
    <Route path="/politique-confidentialite" element={<Confidentialite />} />

    {/* Clerk auth */}
    <Route path="/sign-in/*" element={<SignInPage />} />
    <Route path="/sign-up/*" element={<SignUp routing="path" path="/sign-up" />} />

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
    </Route>

    <Route path="*" element={<Navigate to="/" />} />
  </Routes>
    </div>
    {!isAppArea && <SiteFooter />}
    </div>
);
}
