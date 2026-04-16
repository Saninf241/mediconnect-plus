// src/components/auth/access-context.ts
import { supabase } from "../../lib/supabase";
import { normalizeRole, type AppRole } from "./role-utils";

export type AppArea =
  | "specialist_doctor"
  | "multispecialist_doctor"
  | "multispecialist_secretary"
  | "multispecialist_admin"
  | "assureur"
  | "pharmacy";

export type AccessContext = {
  role: AppRole;
  area: AppArea;
  clinicId?: string | null;
  insurerId?: string | null;
  pharmacyId?: string | null;
  staffId?: string | null;
};

type ClinicJoined = {
  id: string;
  role: string | null;
  clinic_id: string | null;
  clinics: { id: string; name: string | null; type: string | null } | null;
};

function normalizeClinicType(type?: string | null) {
  return (type || "").toLowerCase().trim();
}

function isMultispecialist(type?: string | null) {
  const t = normalizeClinicType(type);
  return ["multi_specialist", "multi-specialist", "multispecialist"].includes(t);
}

export async function resolveAccessContext(params: {
  clerkUserId?: string | null;
  email?: string | null;
  roleFromClerk?: string | null;
}): Promise<AccessContext | null> {
  const { clerkUserId, email } = params;
  const clerkRole = normalizeRole(params.roleFromClerk);

  // 1) CLINIC STAFF
  let clinicStaff: ClinicJoined | null = null;

  if (clerkUserId) {
    const { data } = await supabase
      .from("clinic_staff")
      .select(`
        id,
        role,
        clinic_id,
        clinics:clinics ( id, name, type )
      `)
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle<ClinicJoined>();

    clinicStaff = data ?? null;
  }

  if (!clinicStaff && email) {
    const { data } = await supabase
      .from("clinic_staff")
      .select(`
        id,
        role,
        clinic_id,
        clinics:clinics ( id, name, type )
      `)
      .eq("email", email)
      .maybeSingle<ClinicJoined>();

    clinicStaff = data ?? null;
  }

  if (clinicStaff) {
    const role = normalizeRole(clinicStaff.role) ?? clerkRole;
    const clinicType = clinicStaff.clinics?.type ?? null;

    if (role === "doctor") {
      return {
        role,
        area: isMultispecialist(clinicType)
          ? "multispecialist_doctor"
          : "specialist_doctor",
        clinicId: clinicStaff.clinic_id,
        staffId: clinicStaff.id,
      };
    }

    if (role === "secretary") {
      return {
        role,
        area: "multispecialist_secretary",
        clinicId: clinicStaff.clinic_id,
        staffId: clinicStaff.id,
      };
    }

    if (role === "admin") {
      return {
        role,
        area: "multispecialist_admin",
        clinicId: clinicStaff.clinic_id,
        staffId: clinicStaff.id,
      };
    }
  }

  // 2) INSURER STAFF
  let insurerStaff: { id: string; insurer_id?: string | null } | null = null;

  if (clerkUserId) {
    const { data } = await supabase
      .from("insurer_staff")
      .select("id, insurer_id")
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle();

    insurerStaff = data ?? null;
  }

  if (!insurerStaff && email) {
    const { data } = await supabase
      .from("insurer_staff")
      .select("id, insurer_id")
      .eq("email", email)
      .maybeSingle();

    insurerStaff = data ?? null;
  }

  if (insurerStaff) {
    return {
      role: "assurer",
      area: "assureur",
      insurerId: insurerStaff.insurer_id ?? null,
      staffId: insurerStaff.id,
    };
  }

  // 3) PHARMACY STAFF
  let pharmacyStaff: { id: string; pharmacy_id?: string | null } | null = null;

  if (clerkUserId) {
    const { data } = await supabase
      .from("pharmacy_staff")
      .select("id, pharmacy_id")
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle();

    pharmacyStaff = data ?? null;
  }

  if (!pharmacyStaff && email) {
    const { data } = await supabase
      .from("pharmacy_staff")
      .select("id, pharmacy_id")
      .eq("email", email)
      .maybeSingle();

    pharmacyStaff = data ?? null;
  }

  if (pharmacyStaff) {
    return {
      role: "pharmacist",
      area: "pharmacy",
      pharmacyId: pharmacyStaff.pharmacy_id ?? null,
      staffId: pharmacyStaff.id,
    };
  }

  return null;
}