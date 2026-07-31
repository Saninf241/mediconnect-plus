// src/components/auth/SignUpPage.tsx
// Page d'inscription -- utilisee aussi bien pour une inscription directe
// que pour accepter une invitation Clerk (lien email avec __clerk_ticket).
//
// Bug corrige ici : quand le lien d'invitation est ouvert dans un
// navigateur ou une session Clerk est DEJA active (ex. le compte du
// developpeur qui vient de creer l'invitation, ou n'importe quel autre
// compte), Clerk ignore silencieusement le ticket et reste connecte avec
// la session existante -- l'invitation "disparait" sans jamais creer le
// nouveau compte, et l'utilisateur atterrit connecte en tant que
// quelqu'un d'autre. Avant de laisser <SignUp> traiter le ticket, on
// deconnecte explicitement toute session active et on revient sur la
// MEME URL (ticket inclus) pour que Clerk le traite en etant reellement
// deconnecte.
import { SignUp, useClerk, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function SignUpPage() {
  const [searchParams] = useSearchParams();
  const hasTicket = searchParams.has("__clerk_ticket");
  const { isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!isLoaded || !hasTicket || !isSignedIn || signingOut) return;
    setSigningOut(true);
    // redirectUrl = l'URL courante (ticket inclus) : Clerk revient sur
    // cette meme page une fois la session precedente terminee, et <SignUp>
    // peut alors traiter le ticket en etant reellement deconnecte.
    signOut({ redirectUrl: window.location.href });
  }, [isLoaded, hasTicket, isSignedIn, signingOut, signOut]);

  if (hasTicket && (isSignedIn || signingOut)) {
    return (
      <p className="p-6 text-center text-gray-600">
        Préparation de votre invitation...
      </p>
    );
  }

  return (
    <SignUp
      routing="path"
      path="/sign-up"
      fallbackRedirectUrl="/role-redirect"
      forceRedirectUrl="/role-redirect"
    />
  );
}
