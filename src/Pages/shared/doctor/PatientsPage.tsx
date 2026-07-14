// src/Pages/shared/doctor/PatientsPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { useDoctorContext } from "../../../hooks/useDoctorContext";
import { useDoctorScope } from "../../../hooks/useDoctorScope";

type Patient = {
  id: string;
  name?: string | null;
  date_of_birth?: string | null;
  is_assured?: boolean | null;
};

export default function PatientsPage() {
  const doctorInfo = useDoctorContext();
  const { basePath } = useDoctorScope();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchPatients = async () => {
      if (!doctorInfo?.clinic_id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("patients")
        .select("id, name, date_of_birth, is_assured")
        .eq("clinic_id", doctorInfo.clinic_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[PatientsPage] error:", error);
        setPatients([]);
      } else {
        setPatients((data as Patient[]) || []);
      }

      setLoading(false);
    };

    fetchPatients();
  }, [doctorInfo?.clinic_id]);

  const displayName = (p: Patient) => p.name || "Patient sans nom";

  const filtered = patients.filter((p) =>
    displayName(p).toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mes patients</h1>
        <Link to={`${basePath}/patients/new`}>
          <Button className="bg-emerald-600 text-white hover:bg-emerald-700">
            + Nouveau patient
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        <Input
          type="text"
          placeholder="🔎 Rechercher un patient"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded-xl shadow-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-sm text-gray-600">
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Date de naissance</th>
              <th className="px-4 py-3">Assuré</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="text-center py-4 text-gray-500">
                  Chargement…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-4 text-gray-500">
                  Aucun patient trouvé.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <Link to={`${basePath}/patients/${p.id}`} className="text-blue-600 hover:underline">
                      {displayName(p)}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {p.is_assured ? "✅ Oui" : "❌ Non"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
