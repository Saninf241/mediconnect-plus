import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Button } from "../../../components/ui/button";

interface Doctor {
  id: string;
  name: string;
  email: string;
}

export default function ManageTeamPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [newDoctorEmail, setNewDoctorEmail] = useState("");
  const [clinicId, setClinicId] = useState<string | null>(null);

  // 🔐 Récupère le user ID de l'utilisateur connecté
  const getCurrentUserId = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user.id;
  };

  // 📦 Récupère le clinic_id du dirigeant connecté
  const fetchClinicId = async () => {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { data, error } = await supabase
      .from("clinic_staff")
      .select("clinic_id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (data?.clinic_id) {
      setClinicId(data.clinic_id);
    }
  };

  const fetchDoctors = async () => {
    if (!clinicId) return;
    const { data, error } = await supabase
      .from("clinic_staff")
      .select("id, name, email")
      .eq("clinic_id", clinicId)
      .eq("role", "doctor");

    if (!error && data) setDoctors(data as Doctor[]);
  };

  const addDoctor = async () => {
    if (!clinicId || !newDoctorEmail) return;

    const { error } = await supabase.from("clinic_staff").insert({
      clinic_id: clinicId,
      email: newDoctorEmail,
      role: "doctor",
    });

    if (!error) {
      setNewDoctorEmail("");
      fetchDoctors();
    }
  };

  const removeDoctor = async (id: string) => {
    await supabase.from("clinic_staff").delete().eq("id", id);
    fetchDoctors();
  };

  useEffect(() => {
    fetchClinicId();
  }, []);

  useEffect(() => {
    if (clinicId) fetchDoctors();
  }, [clinicId]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Gérer l’équipe médicale</h1>

      <div className="mb-4 flex gap-2">
        <input
          type="email"
          placeholder="Email du médecin"
          value={newDoctorEmail}
          onChange={(e) => setNewDoctorEmail(e.target.value)}
          className="border p-2 rounded w-72"
        />
        <Button onClick={addDoctor}>Ajouter</Button>
      </div>

      <table className="min-w-full bg-white border rounded">
        <thead>
          <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
            <th className="p-3">Nom</th>
            <th className="p-3">Email</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {doctors.map((d) => (
            <tr key={d.id} className="border-t text-sm">
              <td className="p-3">{d.name || "—"}</td>
              <td className="p-3">{d.email}</td>
              <td className="p-3">
                <Button onClick={() => removeDoctor(d.id)}>Supprimer</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
