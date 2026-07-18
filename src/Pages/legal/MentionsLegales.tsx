// src/Pages/legal/MentionsLegales.tsx
import { Link } from "react-router-dom";

export default function MentionsLegales() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link to="/" className="text-indigo-600 hover:underline text-sm">
        ← Retour à l'accueil
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-8">Mentions légales</h1>

      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Éditeur du site</h2>
          <p>
            Le site et la solution MediConnect+ sont édités par <b>SANINF SARLU</b>,
            société à responsabilité limitée unipersonnelle (SARLU) de droit gabonais,
            au capital social de 200 000 FCFA, créée en juin 2023 au Gabon.
          </p>
          <p className="mt-2">
            Gérant : Loïc Nael Ndoung.
            <br />
            Contact : <a href="mailto:contact@ndoungconsulting.com" className="text-indigo-600 hover:underline">contact@ndoungconsulting.com</a>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Hébergement</h2>
          <p>
            L'application est hébergée par des prestataires cloud tiers (infrastructure
            web et base de données). Les coordonnées complètes de l'hébergeur peuvent
            être communiquées sur simple demande à l'adresse de contact ci-dessus.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Activité</h2>
          <p>
            MediConnect+ est une plateforme logicielle destinée aux cliniques, cabinets
            médicaux, assureurs, courtiers et pharmacies, permettant la gestion des
            dossiers patients, la vérification d'assurance en temps réel et la lutte
            contre la fraude aux soins.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Propriété intellectuelle</h2>
          <p>
            L'ensemble des éléments du site (textes, logos, marques, code source) est la
            propriété de SANINF SARLU, sauf mention contraire, et ne peut être reproduit
            sans autorisation préalable.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Données personnelles</h2>
          <p>
            Le traitement des données personnelles et de santé est détaillé dans notre{" "}
            <Link to="/politique-confidentialite" className="text-indigo-600 hover:underline">
              politique de confidentialité
            </Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
