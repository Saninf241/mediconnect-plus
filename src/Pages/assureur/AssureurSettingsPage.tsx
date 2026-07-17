// src/Pages/assureur/AssureurSettingsPage.tsx
import { useEffect, useState } from "react";
import { Card } from "../../components/ui/card";
import { supabase } from "../../lib/supabase";
import { useInsurerContext } from "../../hooks/useInsurerContext";

const LEVEL_LABELS: Record<string, { label: string; description: string }> = {
  N1: {
    label: "N1 — Intégration automatisée",
    description:
      "Vérification des droits en temps réel via API/fichier avec l'assureur.",
  },
  N2: {
    label: "N2 — Base consultable",
    description:
      "L'assureur dispose d'une base d'adhérents consultable, mais sans automatisation ; le rapprochement se fait au mieux au moment où la secrétaire déclare le patient.",
  },
  N3: {
    label: "N3 — Déclaratif accompagné",
    description:
      "Pas de base numérique côté assureur ; la prise en charge repose sur la déclaration du patient/secrétaire.",
  },
};

type InsurerInfo = { name: string; verification_level: string };

export default function AssureurSettingsPage() {
  const { ctx, loading: ctxLoading } = useInsurerContext();
  const [insurer, setInsurer] = useState<InsurerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ctx) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("insurers")
        .select("name, verification_level")
        .eq("id", ctx.insurerId)
        .maybeSingle();
      if (error) console.error("[AssureurSettingsPage] erreur chargement :", error.message);
      else setInsurer(data);
      setLoading(false);
    })();
  }, [ctx]);

  if (ctxLoading || loading) return <p>Chargement...</p>;
  if (!ctx) return <p className="text-red-600">Impossible de déterminer votre compte assureur.</p>;

  const level = insurer?.verification_level ? LEVEL_LABELS[insurer.verification_level] : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold">Paramètres</h2>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-lg">Organisme</h3>
        <div className="text-sm">
          <span className="text-gray-500">Nom :</span>{" "}
          <span className="font-medium">{insurer?.name ?? "—"}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">Niveau d'intégration :</span>{" "}
          <span className="font-medium">{level?.label ?? insurer?.verification_level ?? "—"}</span>
        </div>
        {level && <p className="text-xs text-gray-500">{level.description}</p>}
        <p className="text-xs text-gray-400">
          Le niveau d'intégration est configuré par Mediconnect+ ; contacte le support pour toute évolution.
        </p>
      </Card>

      <Card className="p-5 space-y-3">
        <h3 className="font-semibold text-lg">Votre compte</h3>
        <div className="text-sm">
          <span className="text-gray-500">Email :</span> <span className="font-medium">{ctx.email}</span>
        </div>
        <div className="text-sm">
          <span className="text-gray-500">Rôle :</span>{" "}
          <span className="font-medium">{ctx.role === "admin" ? "Administrateur" : "Agent"}</span>
        </div>
      </Card>
    </div>
  );
}
