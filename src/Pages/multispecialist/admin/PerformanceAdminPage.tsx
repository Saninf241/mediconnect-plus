// src/Pages/multispecialist/admin/PerformanceAdminPage.tsx

import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { supabase } from "../../../lib/supabase";
import { format } from "date-fns";

interface Doctor {
  id: string;
  name: string | null;
}

interface ConsultationRow {
  created_at: string;
  amount: number | null;
  clinic_staff: { id: string; name: string | null } | null;
  status: string | null;
}

type Period = "month" | "quarter" | "year";

// les clés de séries seront de la forme "doc:<id>"
type ChartRow = {
  date: string;
  [seriesKey: string]: string | number; // "doc:<id>": number
};

const PerformancePage = () => {
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [filteredDoctorId, setFilteredDoctorId] = useState<string>("all");
  const [period, setPeriod] = useState<Period>("month");
  const [loading, setLoading] = useState(true);

  // Palette simple (couleurs distinctes)
  const palette = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#8dd1e1", "#a4de6c", "#d0ed57", "#d88484", "#84d8b1", "#c084d8"];

  useEffect(() => {
    try {
      const raw = localStorage.getItem("establishmentUserSession");
      const session = raw ? JSON.parse(raw) : null;
      setClinicId(session?.clinicId ?? null);
    } catch {
      setClinicId(null);
    }
  }, []);

  // Charge médecins (du cabinet)
  useEffect(() => {
    const fetchDoctors = async () => {
      if (!clinicId) return;
      const { data, error } = await supabase
        .from("clinic_staff")
        .select("id, name")
        .eq("clinic_id", clinicId)
        .eq("role", "doctor")
        .order("name", { ascending: true });

      if (error) {
        console.error("Erreur chargement médecins", error);
        setDoctors([]);
      } else {
        setDoctors((data || []) as Doctor[]);
      }
    };
    fetchDoctors();
  }, [clinicId]);

  // Charge consultations (du cabinet) — uniquement accepted + paid pour la perf
  useEffect(() => {
    const fetchConsultations = async () => {
      if (!clinicId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("consultations")
        .select("created_at, amount, status, clinic_staff(id, name), clinic_id")
        .eq("clinic_id", clinicId)
        .in("status", ["accepted", "paid"])
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Erreur chargement consultations", error);
        setConsultations([]);
      } else {
        const normalized = (data || []).map((c: any) => ({
          ...c,
          clinic_staff: Array.isArray(c.clinic_staff) ? c.clinic_staff[0] ?? null : c.clinic_staff ?? null,
        })) as ConsultationRow[];
        setConsultations(normalized);
      }
      setLoading(false);
    };
    fetchConsultations();
  }, [clinicId]);

  // Construit les données du graphe
  const chartData: ChartRow[] = useMemo(() => {
    // Filtre docteur si besoin
    const rows = filteredDoctorId === "all"
      ? consultations
      : consultations.filter((c) => c.clinic_staff?.id === filteredDoctorId);

    // Regroupe par clé de période
    const group: Record<string, Record<string, number>> = {}; // dateKey -> (seriesKey -> amount)
    const doctorIdsSet = new Set<string>();

    const getDateKey = (iso: string) => {
      const d = new Date(iso);
      if (period === "month") return format(d, "yyyy-MM");
      if (period === "quarter") return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
      return format(d, "yyyy");
    };

    rows.forEach((c) => {
      const id = c.clinic_staff?.id;
      if (!id) return;
      const seriesKey = `doc:${id}`;
      doctorIdsSet.add(id);

      const key = getDateKey(c.created_at);
      if (!group[key]) group[key] = {};
      group[key][seriesKey] = (group[key][seriesKey] || 0) + (Number(c.amount) || 0);
    });

    // Liste triée des dates
    const dateKeys = Object.keys(group).sort((a, b) => a.localeCompare(b));

    // On remplit 0 pour les docteurs absents d'une période, afin d'avoir des courbes continues
    const filled: ChartRow[] = dateKeys.map((date) => {
      const row: ChartRow = { date };
      const present = group[date] || {};
      // Toutes les séries visibles (si filtré, seulement cette série)
      const doctorIds = filteredDoctorId === "all" ? Array.from(doctorIdsSet) : [filteredDoctorId];
      doctorIds.forEach((id) => {
        const seriesKey = `doc:${id}`;
        row[seriesKey] = present[seriesKey] || 0;
      });
      return row;
    });

    return filled;
  }, [consultations, filteredDoctorId, period]);

  // Map id -> name pour les labels
  const idToName = useMemo(() => {
    const m = new Map<string, string>();
    doctors.forEach((d) => m.set(d.id, d.name || "Inconnu"));
    return m;
  }, [doctors]);

  // Liste des docteurs à afficher (si filtre = all → tous les docteurs du cabinet)
  const doctorsToPlot = useMemo(() => {
    if (filteredDoctorId === "all") return doctors;
    const selected = doctors.find((d) => d.id === filteredDoctorId);
    return selected ? [selected] : [];
  }, [doctors, filteredDoctorId]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Tendance des performances</h2>

      {/* Filtres */}
      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={filteredDoctorId}
          onChange={(e) => setFilteredDoctorId(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="all">Tous les médecins</option>
          {doctors.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.name || "Inconnu"}
            </option>
          ))}
        </select>

        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="p-2 border rounded"
        >
          <option value="month">Par mois</option>
          <option value="quarter">Par trimestre</option>
          <option value="year">Par année</option>
        </select>
      </div>

      {/* Graphique */}
      <div className="w-full h-[420px] bg-white rounded shadow p-4">
        {loading ? (
          <div className="p-4 text-sm text-gray-500">Chargement…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {doctorsToPlot.map((doc, idx) => {
                const seriesKey = `doc:${doc.id}`;
                // n'affiche la série que si elle existe dans au moins une ligne
                const hasData = chartData.some((row) => row[seriesKey] !== undefined);
                if (!hasData) return null;
                return (
                  <Line
                    key={seriesKey}
                    type="monotone"
                    dataKey={seriesKey}
                    name={idToName.get(doc.id) || "Inconnu"}
                    stroke={palette[idx % palette.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default PerformancePage;

