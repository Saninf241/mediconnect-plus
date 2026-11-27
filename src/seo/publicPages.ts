// src/seo/publicPages.ts
// Balises <head> propres à chaque page publique pré-rendue.
// Un title et une description UNIQUES par page : c'est ce que lisent Google
// et les IA (le hook usePageMeta ne change le titre qu'une fois le JS exécuté).
//
// Pour ajouter une page publique : créer le composant, l'ajouter ici, dans
// COMPONENTS (src/prerender.tsx) et dans public/sitemap.xml.

export type PublicPage = {
  path: string;
  /** fichier écrit dans dist/ (Netlify sert /chemin depuis /chemin.html) */
  file: string;
  title: string;
  description: string;
};

export const SITE_URL = "https://mediconnect-plus.com";

export const PUBLIC_PAGES: PublicPage[] = [
  {
    path: "/",
    file: "index.html",
    title: "MediConnect+ | Anti-fraude biométrique pour l’assurance santé au Gabon",
    description:
      "MediConnect+ vérifie l’identité de l’assuré par empreinte à chaque acte, contrôle ses droits en temps réel et transmet un dossier vérifié à l’assureur. Pour assureurs, courtiers et cliniques au Gabon.",
  },
  {
    path: "/mentions-legales",
    file: "mentions-legales.html",
    title: "Mentions légales — MediConnect+",
    description:
      "Mentions légales de MediConnect+, édité par SANINF SARLU (Gabon) : éditeur, hébergement, propriété intellectuelle.",
  },
  {
    path: "/politique-confidentialite",
    file: "politique-confidentialite.html",
    title: "Politique de confidentialité — MediConnect+",
    description:
      "Comment MediConnect+ protège vos données de santé et biométriques : base légale (loi gabonaise n°001/2011), sécurité, droits des personnes.",
  },
];
