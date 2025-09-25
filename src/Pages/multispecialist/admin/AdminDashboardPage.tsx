// src/pages/multispecialist/admin/AdminDashboardPage.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Card, CardContent } from "../../../components/ui/card";
import { useClinicId } from "../../../hooks/useClinicId";

interface DoctorActivity {
  doctor_id: string;
  doctor_name: string;
  totalConsultations: number;
}

export default function AdminDashboardPage() {
  const { clinicId, loadingClinic } = useClinicId();

  const [totalDoctors, setTotalDoctors] = useState(0);
  const [topDoctors, setTopDoctors] = useState<DoctorActivity[]>([]);
  const [revenueTotal, setRevenueTotal] = useState(0);
  const [revenueAssured, setRevenueAssured] = useState(0);
  const [openSupportCount, setOpenSupportCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null); // diagnostic RLS

  useEffect(() => {
  if (loadingClinic) return;
  if (!clinicId) { setLoading(false); return; }

  const fetchDashboardData = async () => {
    setLoading(true);
    setNote(null);
    console.log("[Dashboard] clinicId:", clinicId);

    try {
      // A) Nombre de médecins enregistrés
      const staffRes = await supabase
        .from("clinic_staff")
        .select("id, role")
        .eq("clinic_id", clinicId);

      if (staffRes.error) {
        console.error("[Dashboard] clinic_staff error:", staffRes.error);
        setTotalDoctors(0);
      } else {
        const rows = staffRes.data ?? [];
        const doctors = rows.filter(
          (r: any) => (r?.role ?? "").toString().trim().toLowerCase() === "doctor"
        );
        console.log("[Dashboard] staff rows visibles:", rows.length, "doctors:", doctors.length);
        if (rows.length === 0) setNote("Aucune ligne clinic_staff visible (vérifie la whitelist RLS).");
        setTotalDoctors(doctors.length);
      }

      // B) Activité & revenus sur accepted + paid
      const { data: consultations, error: consultationError } = await supabase
        .from("consultations")
        .select(`
          id, doctor_id, amount, status, clinic_id,
          patients ( id, is_assured ),
          clinic_staff ( id, name )
        `)
        .eq("clinic_id", clinicId)
        .in("status", ["accepted", "paid"]);

      if (consultationError) {
        console.error("Erreur chargement consultations", consultationError);
        setTopDoctors([]);
        setRevenueTotal(0);
        setRevenueAssured(0);
      } else {
        const doctorMap: Record<string, DoctorActivity> = {};
        let total = 0, assured = 0;

        (consultations || []).forEach((c: any) => {
          const patient = Array.isArray(c.patients) ? c.patients[0] : c.patients;
          const staffOne = Array.isArray(c.clinic_staff) ? c.clinic_staff[0] : c.clinic_staff;
          const amt = Number(c.amount) || 0;

          total += amt;
          if (patient?.is_assured) assured += amt;

          if (c.doctor_id) {
            const name = staffOne?.name ?? "Inconnu";
            if (!doctorMap[c.doctor_id]) {
              doctorMap[c.doctor_id] = { doctor_id: c.doctor_id, doctor_name: name, totalConsultations: 0 };
            }
            doctorMap[c.doctor_id].totalConsultations += 1;
          }
        });

        const sorted = Object.values(doctorMap).sort((a, b) => b.totalConsultations - a.totalConsultations);
        setTopDoctors(sorted.slice(0, 3));
        setRevenueTotal(total);
        setRevenueAssured(assured);
      }

      // C) Messages support (scope cabinet)
      const r = await supabase
        .from("support_messages")
        .select("id")
        .eq("clinic_id", clinicId)
        .eq("status", "open");
      setOpenSupportCount(r.error ? 0 : (r.data?.length || 0));
    } catch (e) {
      console.error("[Dashboard] unexpected error:", e);
    } finally {
      setLoading(false);
    }
  };

  fetchDashboardData();
}, [clinicId, loadingClinic]);

  if (loadingClinic || loading) return <div className="p-6">Chargement…</div>;

  return (
    <div className="p-6 space-y-4">
      {note && (
        <div className="p-3 rounded bg-amber-50 text-amber-800 text-sm">
          {note}
        </div>
      )}

      <h1 className="text-2xl font-bold">Tableau de bord - Direction</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Médecins (enregistrés)</p>
          <p className="text-3xl font-bold">{totalDoctors}</p>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Revenu estimé (FCFA)</p>
          <p className="text-3xl font-bold">{revenueTotal.toLocaleString()}</p>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Revenu (patients assurés)</p>
          <p className="text-3xl font-bold text-green-600">{revenueAssured.toLocaleString()}</p>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <p className="text-sm text-gray-500">Demandes de support ouvertes</p>
          <p className="text-3xl font-bold text-orange-600">{openSupportCount}</p>
        </CardContent></Card>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">🏆 Top 3 Médecins les plus actifs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topDoctors.map((doc, i) => (
            <Card key={doc.doctor_id}>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">#{i + 1}</p>
                <p className="font-semibold">{doc.doctor_name}</p>
                <p className="text-xs text-gray-400">{doc.totalConsultations} consultations acceptées/payées</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

