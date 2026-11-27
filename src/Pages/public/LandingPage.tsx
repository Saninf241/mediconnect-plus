// src/Pages/public/LandingPage.tsx
// Page d'accueil publique. Extraite de App.tsx pour pouvoir être
// pré-rendue en HTML statique au build (voir src/prerender.tsx) : les
// robots de Google et des IA lisent ainsi le contenu sans exécuter le JS.
// Aucune dépendance à Clerk ni à window ici, sinon le pré-rendu casse.
import { Link } from "react-router-dom";
import { Building, Code, User, CheckCircle2, TrendingUp, ShieldCheck, Building2, Lock, KeyRound, ScrollText, Scale, UserCheck, Fingerprint, FileCheck2, Stethoscope, Inbox, ClipboardCheck, Wallet } from "lucide-react";

const signInTo = (to: string) => `/sign-in?to=${encodeURIComponent(to)}`;

export default function LandingPage() {
  return (
    <>
      {/* HERO + 3 cartes */}
      <section className="w-full py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 mb-3">
              Stoppez l’usurpation d’identité à l’acte.<br className="hidden sm:block" />{" "}
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
                <Link to={signInTo("/multispecialist/secretary/patients")} className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg text-center block">Secrétaire</Link>
                <Link to={signInTo("/doctor/patients")} className="w-full bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg border text-center block">Médecin</Link>
                <Link to={signInTo("/assureur/reports")} className="w-full bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg border text-center block">Assureur</Link>
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
              <Link to="/patient/login" className="text-center block w-full px-4 py-2 bg-white text-emerald-700 rounded-lg hover:bg-emerald-100 transition">
                Accéder à mon espace patient
              </Link>
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
              <Link to={signInTo("/developer")} className="w-full px-4 py-2 bg-white text-indigo-700 rounded-lg hover:bg-indigo-100 transition text-center block">
                Accéder à l’espace développeur
              </Link>
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
              <li className="flex items-start gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" /> Enregistrement sensiblement plus rapide à l’accueil</li>
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
            const whatsappNumber = "33782525687"; // format international wa.me : indicatif pays sans + ni 00
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
}
