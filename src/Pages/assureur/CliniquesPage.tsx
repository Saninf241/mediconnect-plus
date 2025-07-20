// src/pages/assureur/CliniquesPage.tsx
import { useEffect, useState } from "react";
import { Card } from "../../components/ui/card";
import { Database } from "../../types/supabase";
import { supabase } from "../../lib/supabaseClient.ts";

type Clinic = Database["public"]["Tables"]["clinics"]["Row"];

export default function CliniquesPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClinics = async () => {
      const { data, error } = await supabase
        .from("clinics")
        .select("id, name, address, phone, type")
        .order("name");

      if (error) {
        console.error("Erreur lors du chargement des cliniques :", error);
      } else {
        setClinics(data);
      }
      setLoading(false);
    };

    fetchClinics();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Cliniques & Cabinets enregistrés</h2>
      {loading ? (
        <p>Chargement...</p>
      ) : clinics.length === 0 ? (
        <p>Aucune clinique enregistrée.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clinics.map((clinic) => (
            <Card key={clinic.id} className="p-4 space-y-2">
              <h3 className="text-lg font-semibold">{clinic.name}</h3>
              <p className="text-sm text-gray-600">{clinic.address}</p>
              <p className="text-sm text-gray-600">{clinic.phone}</p>
              <span className="inline-block mt-1 px-2 py-1 text-xs rounded bg-gray-100">
                {clinic.type === "clinic" ? "Clinique" : "Cabinet"}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
