// src/Pages/legal/Confidentialite.tsx
import { Link } from "react-router-dom";

export default function Confidentialite() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link to="/" className="text-indigo-600 hover:underline text-sm">
        ← Retour à l'accueil
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-8">
        Politique de confidentialité
      </h1>

      <div className="space-y-6 text-gray-700">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Base légale</h2>
          <p>
            MediConnect+ est édité par SANINF SARLU, société gabonaise. Le traitement
            des données à caractère personnel s'inscrit dans le cadre de la loi
            gabonaise n°001/2011 relative à la protection des données à caractère
            personnel, sous le contrôle de la Commission Nationale de Protection des
            Données à Caractère Personnel (CNPDCP).
          </p>
          <p className="mt-2">
            Nos assurés et partenaires étant présents dans plusieurs pays, nous
            appliquons également, à titre de bonne pratique, des principes inspirés du
            Règlement Général sur la Protection des Données (RGPD) : minimisation des
            données, limitation des finalités, et droits renforcés pour les personnes
            concernées.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Données collectées</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Identité et coordonnées (nom, téléphone, email)</li>
            <li>Données de santé (consultations, ordonnances, historique de soins)</li>
            <li>Données d'assurance (contrat, plan, plafond, éligibilité)</li>
            <li>Gabarits biométriques (empreinte digitale), hachés/templatisés — jamais l'image brute de l'empreinte</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Finalités</h2>
          <p>
            Ces données sont utilisées pour : la prise en charge médicale du patient, la
            vérification d'assurance en temps réel, la prévention de la fraude aux soins,
            la facturation, et l'établissement de statistiques agrégées pour les
            cliniques et assureurs partenaires.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Sécurité</h2>
          <p>
            Les données sont chiffrées en transit (HTTPS/TLS) et au repos (AES-256).
            Les accès sont journalisés et soumis à des autorisations par rôle. Les
            données biométriques sont stockées sous forme de gabarits (templates)
            non réversibles.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Sous-traitants</h2>
          <p>
            Nous faisons appel à des prestataires techniques pour l'authentification
            (Clerk) et le stockage des données (Supabase), liés par des obligations de
            confidentialité et de sécurité.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Vos droits</h2>
          <p>
            Vous disposez d'un droit d'accès, de rectification et de suppression de vos
            données. Pour l'exercer, contactez-nous à{" "}
            <a href="mailto:contact@ndoungconsulting.com" className="text-indigo-600 hover:underline">
              contact@ndoungconsulting.com
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
