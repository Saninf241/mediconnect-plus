// src/pages/multispecialist/admin/PermissionsPage.tsx

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useUser } from "@clerk/clerk-react";
import { Switch } from "../../../components/ui/Switch";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: "doctor" | "secretaire" | string;
  is_active: boolean;
}

export default function PermissionsPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    if (user?.id) {
      fetchStaff(user.id);
    }
  }, [user]);

  async function fetchStaff(userId: string) {
    setLoading(true);

    const { data: currentUserData } = await supabase
      .from("clinic_staff")
      .select("clinic_id")
      .eq("id", userId)
      .single();

    const clinicId = currentUserData?.clinic_id;
    if (!clinicId) return;

    const { data, error } = await supabase
      .from("clinic_staff")
      .select("id, name, email, role, is_active")
      .eq("clinic_id", clinicId);

    if (!error && data) setStaff(data);
    setLoading(false);
  }

  const toggleStatus = async (id: string, isActive: boolean) => {
    await supabase
      .from("clinic_staff")
      .update({ is_active: !isActive })
      .eq("id", id);

    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: !isActive } : s))
    );
  };

  const handleRoleChange = async (id: string, newRole: string) => {
    await supabase
      .from("clinic_staff")
      .update({ role: newRole })
      .eq("id", id);

    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, role: newRole } : s))
    );
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Permissions & Accès</h2>
      {loading ? (
        <p>Chargement...</p>
      ) : (
        <table className="w-full text-sm bg-white shadow-md rounded">
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
            {staff.map((member) => (
              <tr key={member.id} className="border-b">
                <td className="p-3">{member.name}</td>
                <td className="p-3">{member.email}</td>
                <td className="p-3">
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    className="border rounded p-1"
                  >
                    <option value="doctor">Médecin</option>
                    <option value="secretaire">Secrétaire</option>
                  </select>
                </td>
                <td className="p-3">
                  {member.is_active ? "Actif" : "Suspendu"}
                </td>
                <td className="p-3">
                  <Switch
                    checked={member.is_active}
                    onCheckedChange={() =>
                      toggleStatus(member.id, member.is_active)
                    }
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
