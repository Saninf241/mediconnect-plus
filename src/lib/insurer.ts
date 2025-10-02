// src/lib/insurer.ts
export type InsurerType = "api" | "file" | "manual";

export async function checkEligibility(opts: {
  insurerType: InsurerType;
  patient: { nationalId?: string; firstName: string; lastName: string; birthDate?: string };
}): Promise<{ eligible: boolean; plan?: string; raw?: any }> {
  const { insurerType, patient } = opts;

  if (insurerType === "api") {
    // TODO: appeler l’API de l’assureur
    return { eligible: true, plan: "API-PLAN-A" };
  }

  if (insurerType === "file") {
    // TODO: lire fichier déjà ingéré côté back/Supabase et matcher localement
    return { eligible: true, plan: "FILE-PLAN-B" };
  }

  // manual
  return { eligible: false };
}
