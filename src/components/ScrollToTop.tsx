// src/components/ScrollToTop.tsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// React Router ne remet pas le scroll en haut à chaque navigation (contrairement
// à un site classique) : sans ça, cliquer sur "Mentions légales" depuis le pied
// de page en bas d'une longue page laisse l'utilisateur au même endroit visuel,
// donnant l'impression que rien ne s'est passé.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return; // laisser le navigateur gérer le saut vers l'ancre
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
