// src/components/auth/role-utils.ts
export type AppRole = "secretary" | "doctor" | "admin" | "assurer" | "pharmacist";

export function normalizeRole(role?: string | null): AppRole | null {
  const r = (role || "").toLowerCase().trim();

  if (r === "secretary") return "secretary";
  if (["admin", "owner", "manager", "administrateur"].includes(r)) return "admin";
  if (["doctor", "médecin"].includes(r)) return "doctor";
  if (["assurer", "assureur"].includes(r)) return "assurer";
  if (["pharmacist", "pharmacien"].includes(r)) return "pharmacist";

  return null;
}