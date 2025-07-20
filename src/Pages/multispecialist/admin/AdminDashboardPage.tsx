// src/pages/multispecialist/admin/AdminDashboardPage.tsx

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Card, CardContent } from "../../../components/ui/card";

interface DoctorActivity {
  doctor_id: string;
  doctor_name: string;
  totalConsultations: number;
}

export default function AdminDashboardPage() {
  const [totalActiveDoctors, setTotalActiveDoctors] = useState(0);
  const [topDoctors, setTopDoctors] = useState<DoctorActivity[]>([]);
  const [revenueTotal, setRevenueTotal] = useState(0);
  const [revenueAssured, setRevenueAssured] = useState(0);
  const [openSupportCount, setOpenSupportCount] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // CONSULTATIONS
      const { data: consultations, error: consultationError } = await supabase
        .from("consultations")
        .select("id, doctor_id, amount, patient:patients(id, is_assured), clinic_staff(name)")
        .eq("status", "validated");

      if (consultationError) {
        console.error("Erreur chargement consultations", consultationError);
        return;
      }

      const doctorMap: Record<string, DoctorActivity> = {};
      let total = 0;
      let assured = 0;
      const activeDoctorIds = new Set<string>();

      consultations.forEach((c: any) => {
        if (c.doctor_id) {
          activeDoctorIds.add(c.doctor_id);

          if (!doctorMap[c.doctor_id]) {
            doctorMap[c.doctor_id] = {
              doctor_id: c.doctor_id,
              doctor_name: c.clinic_staff?.name ?? "Inconnu",
              totalConsultations: 0,
            };
          }
          doctorMap[c.doctor_id].totalConsultations += 1;
        }

        total += c.amount ?? 0;
        if (c.patient?.is_assured) {
          assured += c.amount ?? 0;
        }
      });

      const sortedDoctors = Object.values(doctorMap).sort(
        (a, b) => b.totalConsultations - a.totalConsultations
      );

      setTotalActiveDoctors(activeDoctorIds.size);
      setTopDoctors(sortedDoctors.slice(0, 3));
      setRevenueTotal(total);
      setRevenueAssured(assured);

      // SUPPORT MESSAGES
      const { data: supportMessages, error: supportError } = await supabase
        .from("support_messages")
        .select("id")
        .eq("status", "open");

      if (supportError) {
        console.error("Erreur chargement messages support", supportError);
        return;
      }

      setOpenSupportCount(supportMessages?.length || 0);
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Tableau de bord - Direction</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Médecins actifs</p>
            <p className="text-3xl font-bold">{totalActiveDoctors}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Revenu estimé (FCFA)</p>
            <p className="text-3xl font-bold">{revenueTotal.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Revenu (patients assurés)</p>
            <p className="text-3xl font-bold text-green-600">
              {revenueAssured.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Demandes de support ouvertes</p>
            <p className="text-3xl font-bold text-orange-600">{openSupportCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">🏆 Top 3 Médecins les plus actifs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topDoctors.map((doc, i) => (
            <Card key={doc.doctor_id}>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">#{i + 1}</p>
                <p className="font-semibold">{doc.doctor_name}</p>
                <p className="text-xs text-gray-400">
                  {doc.totalConsultations} consultations validées
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
