// src/hooks/usePageMeta.ts
import { useEffect } from "react";

// Cette app est une SPA sans librairie de gestion du <head> (pas de
// react-helmet) : chaque page publique appelle ce hook pour donner un
// titre/description distincts, utiles pour le SEO et les onglets du
// navigateur. On restaure les valeurs précédentes au démontage pour ne
// pas laisser le titre d'une page légale collé après un retour à l'accueil.
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const metaDescription = description
      ? document.querySelector<HTMLMetaElement>('meta[name="description"]')
      : null;
    const previousDescription = metaDescription?.getAttribute("content") ?? null;

    if (metaDescription && description) {
      metaDescription.setAttribute("content", description);
    }

    return () => {
      document.title = previousTitle;
      if (metaDescription && previousDescription !== null) {
        metaDescription.setAttribute("content", previousDescription);
      }
    };
  }, [title, description]);
}
