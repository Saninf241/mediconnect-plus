// src/pages/multispecialist/admin/PermissionsPage.tsx

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Switch } from "../../../components/ui/Switch";

interface StaffMember {
  id: string;
  name: string | null;
  email: string | null;
  role: "doctor" | "secretary" | string;
  is_active: boolean;
  clinic_id?: string;
}

export default function PermissionsPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [currentStaffId, setCurrentStaffId] = useState<string | null>(null); // pour éviter de se désactiver soi-même

  // 1) Récupère clinicId & currentStaffId depuis la session établissement
  useEffect(() => {
    try {
      const raw = localStorage.getItem("establishmentUserSession");
      const session = raw ? JSON.parse(raw) : null;
      setClinicId(session?.clinicId ?? null);
      setCurrentStaffId(session?.id ?? null); // si tu stockes l'id de clinic_staff dans la session
    } catch {
      setClinicId(null);
      setCurrentStaffId(null);
    }
  }, []);

  // 2) Charge l'équipe du cabinet
  const fetchStaff = async () => {
    if (!clinicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);

    const { data, error } = await supabase
      .from("clinic_staff")
      .select("id, name, email, role, is_active, clinic_id")
      .eq("clinic_id", clinicId)
      .order("role", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Erreur fetchStaff:", error);
      setErr("Impossible de charger l'équipe.");
      setStaff([]);
    } else {
      setStaff((data || []) as StaffMember[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  const toggleStatus = async (id: string, isActive: boolean) => {
    if (!clinicId) return;
    if (currentStaffId && id === currentStaffId) {
      // optionnel: empêcher l'admin courant de se suspendre lui-même
      return;
    }
    const { error } = await supabase
      .from("clinic_staff")
      .update({ is_active: !isActive })
      .eq("id", id)
      .eq("clinic_id", clinicId);

    if (!error) {
      setStaff((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: !isActive } : s))
      );
    }
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    if (!clinicId) return;
    // Option: empêcher de modifier son propre rôle si tu veux
    const { error } = await supabase
      .from("clinic_staff")
      .update({ role: newRole })
      .eq("id", id)
      .eq("clinic_id", clinicId);

    if (!error) {
      setStaff((prev) =>
        prev.map((s) => (s.id === id ? { ...s, role: newRole as StaffMember["role"] } : s))
      );
    }
  };

  const sortedStaff = useMemo(() => {
    // Regrouper par rôle pour lisibilité
    const order = { admin: 0, doctor: 1, secretary: 2 } as Record<string, number>;
    return [...staff].sort((a, b) => {
      const ra = order[a.role] ?? 99;
      const rb = order[b.role] ?? 99;
      if (ra !== rb) return ra - rb;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [staff]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Permissions & Accès</h2>

      {loading ? (
        <p>Chargement…</p>
      ) : err ? (
        <p className="text-red-600">{err}</p>
      ) : (
        <table className="w-full text-sm bg-white shadow-md rounded overflow-hidden">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-3">Nom</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Rôle</th>
              <th className="text-left p-3">Statut</th>
              <th className="text-left p-3">Activer</th>
            </tr>
          </thead>
          <tbody>
            {sortedStaff.map((member) => (
              <tr key={member.id} className="border-b">
                <td className="p-3">{member.name || "—"}</td>
                <td className="p-3">{member.email || "—"}</td>
                <td className="p-3">
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    className="border rounded p-1"
                  >
                    {/* Si tu veux autoriser l’admin: décommente la ligne suivante */}
                    {/* <option value="admin">Admin</option> */}
                    <option value="doctor">Médecin</option>
                    <option value="secretary">Secrétaire</option>
                  </select>
                </td>
                <td className="p-3">{member.is_active ? "Actif" : "Suspendu"}</td>
                <td className="p-3">
                  <Switch
                    checked={member.is_active}
                    onCheckedChange={() => {
                      if (!!currentStaffId && member.id === currentStaffId) return;
                      toggleStatus(member.id, member.is_active);
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
