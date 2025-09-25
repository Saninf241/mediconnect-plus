// src/lib/auth.ts
import { supabase } from "./supabase";

const authorizedDevelopers: string[] = [
  "nkopierre3@gmail.com",
  "dev2@example.com",
];

export type EstablishmentUser = {
  id: string;
  name: string;
  role: string;
  email: string;
  clinicId: string;
  clinicName: string;
};

function normalizeRole(role: string): "admin" | "doctor" | "secretary" | "assurer" | "pharmacist" {
  const r = (role || "").toLowerCase().trim();
  if (r === "secretary" || r === "secretary") return "secretary";
  if (r === "admin" || r === "owner" || r === "manager") return "admin";
  if (r === "doctor") return "doctor";
  if (r === "assurer" || r === "assureur") return "assurer";
  if (r === "pharmacist" || r === "pharmacien") return "pharmacist";
  // défaut raisonnable
  return "doctor";
}

export async function loginEstablishment(
  emailParam: string,        // ← c’est l’email saisi dans le formulaire
  role: string,
  password: string
): Promise<EstablishmentUser | null> {
  try {
    const userEmail = (emailParam || localStorage.getItem("userEmail") || "").trim().toLowerCase();
    const normalizedRole = normalizeRole(role);

    if (!userEmail) throw new Error("Email utilisateur introuvable");

    // Dev bypass
    if (authorizedDevelopers.includes(userEmail)) {
      return {
        id: "DEV-TEST-ID",
        name: "Développeur Test",
        role: normalizedRole,
        email: userEmail,
        clinicId: "TEST-CLINIC-ID",
        clinicName: "Clinique Test",
      };
    }

    // Assureur (existant)
    if (normalizedRole === "assurer") {
      const { data: etablissement, error } = await supabase
        .from("etablissements")
        .select("*")
        .eq("email", userEmail)
        .eq("type", "assureur")
        .maybeSingle();

      console.log("[login-assurer] status:", error?.message || "ok");
      if (!etablissement) throw new Error("Établissement non trouvé");
      if (password !== "Test2025") throw new Error("Mot de passe incorrect");

      return {
        id: etablissement.id,
        name: etablissement.nom,
        role: "assurer",
        email: etablissement.email || userEmail,
        clinicId: etablissement.id,
        clinicName: etablissement.nom,
      };
    }

    // Pharmacien (existant)
    if (normalizedRole === "pharmacist") {
      const { data: pharmacist, error: pharmacistError } = await supabase
        .from("pharmacy_staff")
        .select(`*, pharmacies ( id, name )`)
        .eq("email", userEmail)
        .eq("role", "pharmacist")
        .maybeSingle();

      console.log("[login-pharmacist] status:", pharmacistError?.message || "ok");
      if (pharmacistError || !pharmacist) throw new Error("Pharmacien non trouvé");

      return {
        id: pharmacist.user_id,
        name: pharmacist.full_name,
        role: pharmacist.role,
        email: pharmacist.email,
        clinicId: pharmacist.pharmacy_id,
        clinicName: pharmacist.pharmacies?.name || "Pharmacie",
      };
    }

    // === CABINETS & CLINIQUES ===
    // 1) essai strict email + rôle
    const q1 = await supabase
      .from("clinic_staff")
      .select(`id, name, role, email, clinic_id, clinics ( id, name )`)
      .eq("email", userEmail)
      .eq("role", normalizedRole)
      .maybeSingle();

    console.log("[login-establishment] q1 err:", q1.error?.message, "data?", !!q1.data);

    let staff = q1.data as any | null;

    // 2) fallback : par email uniquement (au cas où le rôle saisi ≠ rôle stocké)
    if (!staff) {
      const q2 = await supabase
        .from("clinic_staff")
        .select(`id, name, role, email, clinic_id, clinics ( id, name )`)
        .eq("email", userEmail)
        .maybeSingle();

      console.log("[login-establishment] q2 err:", q2.error?.message, "data?", !!q2.data);
      if (q2.data && normalizeRole(q2.data.role) === normalizedRole) staff = q2.data;
    }

    if (!staff) throw new Error("Utilisateur non trouvé pour ce rôle");

    return {
      id: staff.id,
      name: staff.name,
      role: normalizeRole(staff.role),
      email: staff.email,
      clinicId: staff.clinic_id,
      clinicName: staff.clinics?.name || "Établissement",
    };
  } catch (error) {
    console.error("Erreur de connexion:", error);
    return null;
  }
}
