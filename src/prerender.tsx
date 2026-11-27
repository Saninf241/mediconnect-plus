// src/prerender.tsx
// Point d'entrée de pré-rendu, utilisé UNIQUEMENT au build
// (`vite build --ssr src/prerender.tsx`, puis scripts/prerender.mjs).
//
// Pourquoi : l'app est une SPA. Sans pré-rendu, le HTML servi aux robots
// ne contient qu'une <div id="root"> vide. Google rend le JS en différé
// (Search Console : « Page indexée sans contenu ») et les robots des IA
// (GPTBot, ClaudeBot, PerplexityBot) ne l'exécutent pas du tout.
//
// Ici on rend en HTML les seules pages publiques, avec un en-tête
// simplifié (sans Clerk). Au chargement, React remplace ce HTML par l'app
// normale (createRoot), le visiteur ne voit donc aucune différence.
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import LandingPage from "./Pages/public/LandingPage";
import MentionsLegales from "./Pages/legal/MentionsLegales";
import Confidentialite from "./Pages/legal/Confidentialite";
import SiteFooter from "./components/layouts/SiteFooter";
import { PUBLIC_PAGES } from "./seo/publicPages";

const COMPONENTS: Record<string, () => JSX.Element> = {
  "/": LandingPage,
  "/mentions-legales": MentionsLegales,
  "/politique-confidentialite": Confidentialite,
};

function StaticHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="MediConnect+" className="h-12 sm:h-14 md:h-16 w-auto" />
        </a>
      </div>
    </header>
  );
}

export function render(path: string): string {
  const Page = COMPONENTS[path];
  if (!Page) throw new Error(`Pas de composant de pré-rendu pour ${path}`);
  return renderToString(
    <StaticRouter location={path}>
      <div className="min-h-screen flex flex-col">
        <StaticHeader />
        <div className="flex-1 flex flex-col">
          <Page />
        </div>
        <SiteFooter />
      </div>
    </StaticRouter>
  );
}

export { PUBLIC_PAGES };
