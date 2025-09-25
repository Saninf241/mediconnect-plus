// /src/Pages/patient/Identite.tsx
import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "../../lib/supabase";

export default function IdentitePage() {
  const { user } = useUser();
  const [patientData, setPatientData] = useState<any>(null);

  useEffect(() => {
    const fetchPatientInfo = async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("email", user?.primaryEmailAddress?.emailAddress)
        .single();

      if (!error && data) setPatientData(data);
    };

    fetchPatientInfo();
  }, [user]);

  if (!patientData) {
    return <p className="p-6">Chargement de vos informations...</p>;
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">🧾 Mon identité</h1>

      <div className="bg-white shadow rounded p-4 space-y-2">
        <p><strong>Nom complet :</strong> {patientData.name}</p>
        <p><strong>Email :</strong> {patientData.email}</p>
        <p><strong>Téléphone :</strong> {patientData.phone || "Non renseigné"}</p>
        <p><strong>Date de naissance :</strong> {patientData.date_of_birth ? new Date(patientData.date_of_birth).toLocaleDateString() : "Non renseignée"}</p>

        <p><strong>Identifiant patient :</strong> {patientData.id}</p>
        <p><strong>ID biométrique :</strong> {patientData.biometric_id || "Non attribué"}</p>

        <p><strong>Statut :</strong> {patientData.status}</p>
        <p><strong>Date de dernière visite :</strong> {patientData.last_visit_date ? new Date(patientData.last_visit_date).toLocaleDateString() : "Aucune"}</p>

        <p><strong>Assurance :</strong> {patientData.insurance_number || "Non renseignée"}</p>
        <p><strong>Organisme :</strong> {patientData.insurance_provider || "Non précisé"}</p>
        <p><strong>Type :</strong> {patientData.insurance_type || "Non précisé"}</p>
        <p><strong>Échéance :</strong> {patientData.insurance_expiry ? new Date(patientData.insurance_expiry).toLocaleDateString() : "Non précisée"}</p>
        <p><strong>Statut assurance :</strong> {patientData.insurance_status || "Inconnu"}</p>
        <p><strong>Assuré ?</strong> {patientData.is_assured ? "✅ Oui" : "❌ Non"}</p>

        <p><strong>Empreinte biométrique :</strong> {patientData.fingerprint_missing ? "❌ Absente" : "✅ Enregistrée"}</p>

        <p><strong>Contact d’urgence :</strong> {patientData.emergency_contact || "Non renseigné"}</p>
        <p><strong>Antécédents médicaux :</strong> {patientData.medical_history || "Non renseignés"}</p>

        <p className="text-sm text-gray-500">
          Dernière mise à jour : {new Date(patientData.updated_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
