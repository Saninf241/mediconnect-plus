// src/Pages/assureur/CliniquesPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Card } from "../../components/ui/card";
import { supabase } from "../../lib/supabase";
import { useInsurerContext } from "../../hooks/useInsurerContext";

type ClinicRow = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  type: string | null;
  count: number;
};

export default function CliniquesPage() {
  const { ctx, loading: ctxLoading } = useInsurerContext();
  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!ctx) return;

    const fetchClinics = async () => {
      setLoading(true);

      const { data: consultationRows, error: consultError } = await supabase
        .from("consultations")
        .select("clinic_id")
        .eq("insurer_id", ctx.insurerId);

      if (consultError) {
        console.error("[CliniquesPage] erreur consultations :", consultError.message);
        setClinics([]);
        setLoading(false);
        return;
      }

      const counts = new Map<string, number>();
      for (const row of consultationRows ?? []) {
        if (!row.clinic_id) continue;
        counts.set(row.clinic_id, (counts.get(row.clinic_id) ?? 0) + 1);
      }

      const clinicIds = Array.from(counts.keys());
      if (clinicIds.length === 0) {
        setClinics([]);
        setLoading(false);
        return;
      }

      const { data: clinicRows, error: clinicError } = await supabase
        .from("clinics")
        .select("id, name, address, phone, type")
        .in("id", clinicIds);

      if (clinicError) {
        console.error("[CliniquesPage] erreur cliniques :", clinicError.message);
        setClinics([]);
      } else {
        const merged = (clinicRows ?? []).map((c) => ({ ...c, count: counts.get(c.id) ?? 0 }));
        merged.sort((a, b) => b.count - a.count);
        setClinics(merged);
      }
      setLoading(false);
    };

    fetchClinics();
  }, [ctx]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clinics;
    return clinics.filter((c) => c.name.toLowerCase().includes(q));
  }, [clinics, search]);

  if (ctxLoading) return <p>Chargement...</p>;
  if (!ctx) return <p className="text-red-600">Impossible de déterminer votre compte assureur.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Cliniques & cabinets partenaires</h2>
        <input
          type="text"
          placeholder="Rechercher une clinique..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-2 text-sm w-64"
        />
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : filtered.length === 0 ? (
        <p>Aucune clinique n'a encore de consultation avec vos assurés.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((clinic) => (
            <Card key={clinic.id} className="p-4 space-y-2">
              <h3 className="text-lg font-semibold">{clinic.name}</h3>
              <p className="text-sm text-gray-600">{clinic.address}</p>
              <p className="text-sm text-gray-600">{clinic.phone}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="inline-block px-2 py-1 text-xs rounded bg-gray-100">
                  {clinic.type === "multi_specialist" ? "Multi-spécialiste" : "Spécialiste"}
                </span>
                <span className="text-sm font-medium text-indigo-700">
                  {clinic.count} consultation{clinic.count > 1 ? "s" : ""}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
