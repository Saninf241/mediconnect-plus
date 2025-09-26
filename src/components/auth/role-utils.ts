// src/components/auth/role-utils.ts
export function normalizeRole(role?: string) {
  const r = (role || "").toLowerCase().trim();
  if (["secretary"].includes(r)) return "secretary";
  if (["admin","owner","manager","administrateur"].includes(r)) return "admin";
  if (["doctor","médecin"].includes(r)) return "doctor";
  if (["assurer","assureur"].includes(r)) return "assurer";
  if (["pharmacist","pharmacien"].includes(r)) return "pharmacist";
  return "doctor";
}
