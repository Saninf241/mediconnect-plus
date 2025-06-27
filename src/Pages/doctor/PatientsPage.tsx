// src/Pages/doctor/PatientsPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  is_assured: boolean;
}

export default function PatientsPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState<Patient[]>([]);

  useEffect(() => {
    const fetchPatients = async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, first_name, last_name, is_assured");

      if (!error && data) {
        setPatients(data);
        setFiltered(data);
      }
    };

    fetchPatients();
  }, []);

  const handleSearch = () => {
    setFiltered(
      patients.filter((p) =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())
      )
    );
  };

  const handleReset = () => {
    setFiltered(patients);
    setSearch("");
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-700">👥 Mes Patients</h1>
        <Button
          onClick={() => navigate("/doctor/patients/new")}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          ➕ Nouveau patient
        </Button>
      </div>

      <div className="flex gap-2 mb-4">
        <Input
          type="text"
          placeholder="🔎 Rechercher un patient"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button onClick={handleSearch}>Rechercher</Button>
        <Button variant="outline" onClick={handleReset}>
          Réinitialiser
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border rounded-xl shadow-md">
          <thead>
            <tr className="bg-gray-50 text-left text-sm text-gray-600">
              <th className="px-4 py-3">Nom complet</th>
              <th className="px-4 py-3">Assuré</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={2} className="text-center py-4 text-gray-500">
                  Aucun patient trouvé.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {p.first_name} {p.last_name}
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
