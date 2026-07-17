// src/pages/doctor/DashboardPage.tsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { XCircle, Clock3, PartyPopper } from 'lucide-react';
import { useDoctorContext } from '../../hooks/useDoctorContext';
import { useDoctorScope } from '../../hooks/useDoctorScope';

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
  const doctorInfo = useDoctorContext();
  const navigate = useNavigate();
  const { basePath } = useDoctorScope();
  const [amountAssured, setAmountAssured] = useState(0);
  const [amountNotAssured, setAmountNotAssured] = useState(0);
  const [topActs, setTopActs] = useState<{ label: string; count: number }[]>([]);
  const [rejectedOrUnpaid, setRejectedOrUnpaid] = useState<Consultation[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const doctorId = doctorInfo?.doctor_id;
      const clinicId = doctorInfo?.clinic_id;
      if (!doctorId || !clinicId) return;

      const { data: consultations } = await supabase
        .from('consultations')
        .select('id, created_at, amount, status, patient_id')
        .eq('doctor_id', doctorId);

      const { data: patients } = await supabase
        .from('patients')
        .select('id, is_assured')
        .eq('clinic_id', clinicId);

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
  }, [doctorInfo]);

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

        <div className="bg-white p-4 rounded-xl shadow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Consultations rejetées ou en attente</h3>
            {rejectedOrUnpaid.length > 0 && (
              <button
                onClick={() => navigate(`${basePath}/consultation-follow-up`)}
                className="text-sm text-indigo-600 hover:underline"
              >
                Voir tout
              </button>
            )}
          </div>

          {rejectedOrUnpaid.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-gray-500">
              <PartyPopper className="text-emerald-500" size={28} />
              <span className="text-sm">Aucune consultation rejetée ou en attente.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {rejectedOrUnpaid.slice(0, 8).map((c) => {
                const isRejected = c.status === 'rejected';
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => navigate(`${basePath}/consultations/${c.id}`)}
                    className="w-full flex items-center justify-between gap-3 border rounded-lg p-3 text-left hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      {isRejected ? (
                        <XCircle className="text-red-500 shrink-0" size={18} />
                      ) : (
                        <Clock3 className="text-orange-500 shrink-0" size={18} />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-800">
                          {new Date(c.created_at).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {c.amount != null ? `${c.amount.toLocaleString('fr-FR')} FCFA` : '—'}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        isRejected ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {isRejected ? 'Rejetée' : 'En attente'}
                    </span>
                  </button>
                );
              })}

              {rejectedOrUnpaid.length > 8 && (
                <div className="text-xs text-gray-500 text-center pt-1">
                  + {rejectedOrUnpaid.length - 8} autre(s) — voir tout pour la liste complète.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
