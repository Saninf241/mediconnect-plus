import { createClient } from "@supabase/supabase-js";
import { clerkClient } from "@clerk/clerk-sdk-node";

// Initialise Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY! // ⚠️ Pas la clé publique ici
);

async function syncPatientsWithClerk() {
  const { data: patients, error } = await supabase
    .from("patients")
    .select("id, email");

  if (error) {
    console.error("❌ Erreur récupération patients Supabase :", error);
    return;
  }

  if (!patients) {
    console.warn("⚠️ Aucun patient trouvé.");
    return;
  }

  for (const patient of patients) {
    if (!patient.email) continue;

    try {
      // Vérifie s’il y a un utilisateur Clerk avec cet email
      const users = await clerkClient.users.getUserList({
        emailAddress: [patient.email],
      });

      if (users.length === 0) {
        console.warn(`⚠️ Aucun utilisateur Clerk trouvé pour ${patient.email}`);
        continue;
      }

      const clerkUser = users[0];
      const authUserId = clerkUser.id;

      // Met à jour Supabase avec auth_user_id
      const { error: updateError } = await supabase
        .from("patients")
        .update({ auth_user_id: authUserId })
        .eq("id", patient.id);

      if (updateError) {
        console.error(`❌ Erreur mise à jour pour ${patient.email}`, updateError);
      } else {
        console.log(`✅ Patient mis à jour : ${patient.email} -> ${authUserId}`);
      }
    } catch (err) {
      console.error(`❌ Erreur pour ${patient.email} :`, err);
    }
  }
}

syncPatientsWithClerk();

