import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import ConsultationChat from '../../components/ui/uidoctor/ConsultationChat';
import { useUser } from '@clerk/clerk-react';

export default function ConsultationDetailsPage() {
  const { id } = useParams();
  const { user } = useUser();
  const [insurerId, setInsurerId] = useState<string | null>(null);
  const [consultation, setConsultation] = useState<any>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<'basic' | 'premium' | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      const email = user?.emailAddresses?.[0]?.emailAddress;
      if (!email) return;
      const { data: staff } = await supabase
        .from('clinic_staff')
        .select('clinic_id')
        .eq('email', email)
        .maybeSingle();

      if (staff?.clinic_id) {
        const { data: clinic } = await supabase
          .from('clinics')
          .select('subscription_plan')
          .eq('id', staff.clinic_id)
          .maybeSingle();

        if (clinic?.subscription_plan) setSubscriptionPlan(clinic.subscription_plan);
      }
    };

    fetchSubscription();
  }, [user]);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;

      const { data: consultationData, error } = await supabase
        .from('consultations')
        .select('patient_id, symptoms_drawn, diagnosis_drawn, pdf_url, medications')
        .eq('id', id)
        .single();

      if (error || !consultationData) return;

      setConsultation(consultationData);

      const { data: patient } = await supabase
        .from('patients')
        .select('insurer_id')
        .eq('id', consultationData.patient_id)
        .single();

      if (patient?.insurer_id) {
        setInsurerId(patient.insurer_id);
      }
    };

    fetchDetails();
  }, [id]);

  if (!id) return <p>Consultation non trouvée</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Détails de la consultation</h1>

      {subscriptionPlan !== 'premium' && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded">
          Cette page est limitée pour les abonnements non premium. Abonnez-vous pour débloquer l’accès complet aux rapports.
        </div>
      )}

      <div className={`${subscriptionPlan !== 'premium' ? 'opacity-50 pointer-events-none select-none' : ''}`}>
        {insurerId ? (
          <ConsultationChat consultationId={id} insurerId={insurerId} senderRole="doctor" />
        ) : (
          <p className="text-gray-500">Aucun assureur identifié pour ce patient.</p>
        )}

        {consultation?.pdf_url && (
          <div>
            <h3 className="text-md font-semibold mt-6">Rapport PDF :</h3>
            <a
              href={consultation.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              Ouvrir le rapport PDF
            </a>
          </div>
        )}

        {consultation?.symptoms_drawn && (
          <div>
            <h3 className="text-md font-semibold mt-6">Symptômes manuscrits :</h3>
            <img
              src={consultation.symptoms_drawn}
              alt="Symptômes manuscrits"
              className="mt-2 border border-gray-300 rounded max-w-md"
            />
          </div>
        )}

        {consultation?.diagnosis_drawn && (
          <div>
            <h3 className="text-md font-semibold mt-6">Diagnostic manuscrit :</h3>
            <img
              src={consultation.diagnosis_drawn}
              alt="Diagnostic manuscrit"
              className="mt-2 border border-gray-300 rounded max-w-md"
            />
          </div>
        )}

        {consultation?.medications?.length > 0 && (
          <div>
            <h3 className="text-md font-semibold mt-6">💊 Médicaments prescrits :</h3>
            <ul className="list-disc pl-6 mt-2 text-sm text-gray-700">
              {consultation.medications.map((med: string, idx: number) => (
                <li key={idx}>{med}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
