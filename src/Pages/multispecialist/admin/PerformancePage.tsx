// src/Pages/multispecialist/admin/PerformancePage.tsx

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { supabase } from "../../../lib/supabase";
import { format } from "date-fns";

interface Doctor {
  id: string;
  name: string;
}

interface Consultation {
  created_at: string;
  amount: number;
  clinic_staff: { id: string; name: string };
}

interface FormattedData {
  date: string;
  [doctorName: string]: string | number;
}

const PerformancePage = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [filteredDoctorId, setFilteredDoctorId] = useState<string>("all");
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  const [chartData, setChartData] = useState<FormattedData[]>([]);

  useEffect(() => {
    const fetchDoctors = async () => {
      const { data, error } = await supabase.from("clinic_staff").select("id, name").eq("role", "doctor");
      if (data) setDoctors(data);
      if (error) console.error("Erreur chargement médecins", error);
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    const fetchConsultations = async () => {
      const { data, error } = await supabase
        .from("consultations")
        .select("created_at, amount, clinic_staff(id, name)")
        .order("created_at", { ascending: true });
      if (data) {
        setConsultations(
          data.map((c: any) => ({
            ...c,
            clinic_staff: Array.isArray(c.clinic_staff) ? c.clinic_staff[0] : c.clinic_staff,
          }))
        );
      }
      if (error) console.error("Erreur chargement consultations", error);
    };
    fetchConsultations();
  }, []);

  useEffect(() => {
    const filtered = filteredDoctorId === "all"
      ? consultations
      : consultations.filter((c) => c.clinic_staff?.id === filteredDoctorId);

    const grouped: { [key: string]: { [doctor: string]: number } } = {};

    filtered.forEach((c) => {
      let dateKey = "";
      const date = new Date(c.created_at);
      if (period === "month") dateKey = format(date, "yyyy-MM");
      if (period === "quarter") dateKey = `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
      if (period === "year") dateKey = format(date, "yyyy");

      const doctorName = c.clinic_staff?.name || "Inconnu";
      if (!grouped[dateKey]) grouped[dateKey] = {};
      grouped[dateKey][doctorName] = (grouped[dateKey][doctorName] || 0) + c.amount;
    });

    const formatted: FormattedData[] = Object.entries(grouped).map(([date, doctorAmounts]) => ({
      date,
      ...doctorAmounts
    }));

    formatted.sort((a, b) => a.date.localeCompare(b.date));
    setChartData(formatted);
  }, [consultations, filteredDoctorId, period]);

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
              {doc.name}
            </option>
          ))}
        </select>

        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as "month" | "quarter" | "year")}
          className="p-2 border rounded"
        >
          <option value="month">Par mois</option>
          <option value="quarter">Par trimestre</option>
          <option value="year">Par année</option>
        </select>
      </div>

      {/* Graphique */}
      <div className="w-full h-[400px] bg-white rounded shadow p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {doctors.map((doc) =>
              chartData.some((d) => d[doc.name] !== undefined) ? (
                <Line
                  key={doc.id}
                  type="monotone"
                  dataKey={doc.name}
                  strokeWidth={2}
                  dot={false}
                  stroke="#8884d8"
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PerformancePage;
