// src/pages/doctor/DashboardPage.tsx
import { useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Consultation {
  id: string;
  created_at: string;
  amount: number;
  status: string;
  patient_id: string;
}

interface Patient {
  id: string;
  is_assured: boolean;
  insurer_name?: string;
}

export default function DashboardPage() {
  const { user } = useUser();
  const [amountAssured, setAmountAssured] = useState(0);
  const [amountNotAssured, setAmountNotAssured] = useState(0);
  const [topActs, setTopActs] = useState<{ label: string; count: number }[]>([]);
  const [rejectedOrUnpaid, setRejectedOrUnpaid] = useState<Consultation[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const doctorId = user?.id;
      if (!doctorId) return;

      const { data: consultations } = await supabase
        .from('consultations')
        .select('id, created_at, amount, status, patient_id')
        .eq('doctor_id', doctorId);

      const { data: patients } = await supabase
        .from('patients')
        .select('id, is_assured');

      if (!consultations || !patients) return;

      const assuredIds = new Set(patients.filter(p => p.is_assured).map(p => p.id));
      const notAssuredIds = new Set(patients.filter(p => !p.is_assured).map(p => p.id));

      setAmountAssured(
        consultations.filter(c => assuredIds.has(c.patient_id)).reduce((sum, c) => sum + (c.amount || 0), 0)
      );

      setAmountNotAssured(
        consultations.filter(c => notAssuredIds.has(c.patient_id)).reduce((sum, c) => sum + (c.amount || 0), 0)
      );

      setRejectedOrUnpaid(
        consultations.filter(c => c.status === 'rejected' || c.status === 'sent')
      );
    };

    fetchData();
  }, [user]);

  const handleGeneratePDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF();
    pdf.addImage(imgData, 'PNG', 10, 10, 190, 0);
    pdf.save('dashboard_medecin.pdf');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <button
          onClick={handleGeneratePDF}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Générer le PDF
        </button>
      </div>

      <div ref={reportRef} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold">Tarif standard non assuré</h3>
            <p className="text-xl font-bold text-gray-700">21 000 FCFA</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold">Total assurés</h3>
            <p className="text-xl font-bold text-emerald-600">{amountAssured.toLocaleString()} FCFA</p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold">Total non assurés</h3>
            <p className="text-xl font-bold text-orange-500">{amountNotAssured.toLocaleString()} FCFA</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-lg font-semibold mb-2">Consultations rejetées ou en attente</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            {rejectedOrUnpaid.map(c => (
              <li key={c.id}>
                {new Date(c.created_at).toLocaleDateString()} – Montant : {c.amount} FCFA – Statut : {c.status}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
