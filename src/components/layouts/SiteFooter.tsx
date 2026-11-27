// src/components/layouts/SiteFooter.tsx
// Footer marketing des pages publiques (aussi utilisé par le pré-rendu).
import { Link } from "react-router-dom";
import { Facebook, Linkedin, Mail, MessageCircle } from "lucide-react";

export default function SiteFooter() {
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
        href="https://wa.me/33782525687?text=Je%20souhaite%20en%20savoir%20plus%20sur%20MediConnect%2B"
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
