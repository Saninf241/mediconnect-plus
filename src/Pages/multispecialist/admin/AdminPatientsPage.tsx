// src/pages/multispecialist/admin/PatientsPage.tsx

import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "../../../lib/supabase";

interface Patient {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
  is_assured: boolean;
}

const PatientsPage = () => {
  const { user } = useUser();
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    if (user?.id) fetchPatients();
  }, [user]);

  const fetchPatients = async () => {
    // Récupération du clinic_id de l’admin connecté
    const { data: staff, error: staffError } = await supabase
      .from("clinic_staff")
      .select("clinic_id")
      .eq("id", user?.id)
      .single();

    if (staffError || !staff?.clinic_id) return;

    const { data, error } = await supabase
      .from("patients")
      .select("id, full_name, phone, created_at, is_assured")
      .eq("clinic_id", staff.clinic_id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPatients(data);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Liste des patients</h2>

      <div className="overflow-x-auto bg-white shadow rounded">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Nom complet</th>
              <th className="p-3">Téléphone</th>
              <th className="p-3">Assuré</th>
              <th className="p-3">Créé le</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient) => (
              <tr key={patient.id} className="border-t">
                <td className="p-3">{patient.full_name}</td>
                <td className="p-3">{patient.phone}</td>
                <td className="p-3">
                  {patient.is_assured ? (
                    <span className="text-green-600 font-semibold">Oui</span>
                  ) : (
                    <span className="text-gray-500">Non</span>
                  )}
                </td>
                <td className="p-3">
                  {new Date(patient.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {patients.length === 0 && (
        <p className="mt-4 text-gray-500">Aucun patient enregistré pour ce cabinet.</p>
      )}
    </div>
  );
};

export default PatientsPage;
