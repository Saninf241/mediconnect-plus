// src/Pages/shared/doctor/ConsultationDetailsPage.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../../lib/supabase";
import { Button } from "../../../components/ui/button";
import { generatePrescriptionPdf } from "../../../lib/api/generatePrescriptionPdf";
import ConsultationChatDoctor from "../../../components/ui/uidoctor/ConsultationChat";

interface Act {
  code?: string | null;
  title?: string | null;
}

interface ManualPricing {
  proposed_amount: number;
  justification: string | null;
  status: string;
  rejection_reason: string | null;
}

interface ConsultationRecord {
  id: string;
  created_at: string;
  amount: number | null;
  status: string;
  pdf_url: string | null;
  insurer_decision_at: string | null;
  insurer_comment: string | null;
  insurer_id: string | null;
  medications: string[] | null;
  doctor_id: string | null;
  insurer_agent_id: string | null;
  diagnosis: string | null;
  symptoms: string | null;
  acts: Act[] | null;
  diagnosis_code_text: string | null;
  pricing_status: string | null;
  insurer_amount: number | null;
  dispense_code: string | null;
  pharmacy_id: string | null;

  // jointures
  patients?: {
    name?: string | null;
    phone?: string | null;
    date_of_birth?: string | null;
  } | null;

  clinics?: {
    name?: string | null;
  } | null;

  clinic_staff?: {
    name?: string | null;
  } | null;
}

type DeliveryStatus = {
  delivered_at: string;
  delivered_items: string[];
  pharmacies: { name: string | null } | null;
};

type PharmacyOption = { id: string; name: string };

export default function ConsultationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<ConsultationRecord | null>(null);
  const [manualPricing, setManualPricing] = useState<ManualPricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFlagged, setIsFlagged] = useState(false);
  const [pharmacies, setPharmacies] = useState<PharmacyOption[]>([]);
  const [savingPharmacy, setSavingPharmacy] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryStatus | null>(null);

  // Flag "en revue" atténué (anti-fraude) : signal générique, sans détail de
  // règle ni de seuil — voir doctor_flagged_consultation_ids() côté SQL.
  useEffect(() => {
    if (!id) return;
    supabase.rpc("doctor_flagged_consultation_ids").then(({ data, error }) => {
      if (error) {
        console.error("[DoctorDetails] flagged ids error:", error);
        return;
      }
      setIsFlagged(((data ?? []) as string[]).includes(id));
    });
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const fetchConsultation = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("consultations")
        .select(
          `
          id,
          created_at,
          amount,
          status,
          pdf_url,
          insurer_decision_at,
          insurer_comment,
          insurer_id,
          insurer_agent_id,
          medications,
          doctor_id,
          diagnosis,
          symptoms,
          acts,
          diagnosis_code_text,
          pricing_status,
          insurer_amount,
          dispense_code,
          pharmacy_id,
          patients ( name, phone, date_of_birth ),
          clinics ( name ),
          clinic_staff:clinic_staff!consultations_doctor_id_fkey ( name )
        `
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("[DoctorDetails] error fetching consultation:", error);
      } else if (data) {
        setRecord(data as ConsultationRecord);
      }

      const needsManualPricingDetail =
        data && (data as ConsultationRecord).pricing_status !== "computed";

      if (needsManualPricingDetail) {
        const { data: pricing, error: pricingError } = await supabase
          .from("consultation_manual_pricing")
          .select("proposed_amount, justification, status, rejection_reason")
          .eq("consultation_id", id)
          .maybeSingle();

        if (pricingError) {
          console.error("[DoctorDetails] error fetching manual pricing:", pricingError);
        } else {
          setManualPricing((pricing as ManualPricing) ?? null);
        }
      }

      setLoading(false);
    };

    fetchConsultation();
  }, [id]);

  // Pharmacies actives, pour le sélecteur facultatif "pharmacie associée".
  useEffect(() => {
    supabase
      .from("pharmacies")
      .select("id, name")
      .eq("is_active", true)
      .order("name")
      .then(({ data, error }) => {
        if (error) {
          console.error("[DoctorDetails] pharmacies fetch error:", error);
          return;
        }
        setPharmacies((data as PharmacyOption[]) || []);
      });
  }, []);

  // Statut de délivrance, une fois l'ordonnance retirée en pharmacie.
  useEffect(() => {
    if (!id) return;
    supabase
      .from("pharmacy_deliveries")
      .select("delivered_at, delivered_items, pharmacies ( name )")
      .eq("consultation_id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("[DoctorDetails] delivery fetch error:", error);
          return;
        }
        setDelivery(data as DeliveryStatus | null);
      });
  }, [id]);

  const handlePharmacyChange = async (pharmacyId: string) => {
    if (!record) return;
    setSavingPharmacy(true);
    const { error } = await supabase
      .from("consultations")
      .update({ pharmacy_id: pharmacyId || null })
      .eq("id", record.id);
    setSavingPharmacy(false);

    if (error) {
      console.error("[DoctorDetails] pharmacy update error:", error);
      alert("Impossible d’enregistrer la pharmacie associée.");
      return;
    }
    setRecord({ ...record, pharmacy_id: pharmacyId || null });
  };

  if (loading || !record) {
    return (
      <div className="p-6">
        <p>Chargement des détails de la consultation…</p>
      </div>
    );
  }

  // 🧩 Noms à afficher
  const patientName =
    record.patients?.name ||
    // sécurité au cas où la colonne serait différente
    (record as any).patient_name ||
    "—";

  const clinicName =
    record.clinics?.name ||
    (record as any).clinic_name ||
    "—";

  const doctorName =
    record.clinic_staff?.name ||
    (record as any).doctor_name ||
    "—";

  const decisionDate = record.insurer_decision_at
    ? new Date(record.insurer_decision_at).toLocaleString()
    : "—";

  const createdDate = new Date(record.created_at).toLocaleString();

  const meds = record.medications ?? [];

  // 👉 Génération de l’ordonnance
  const handleGeneratePrescription = async () => {
    try {
      await generatePrescriptionPdf({
        consultationId: record.id,
        patientName: patientName === "—" ? "Patient inconnu" : patientName,
        clinicName: clinicName === "—" ? "Établissement" : clinicName,
        doctorName: doctorName === "—" ? "Médecin" : doctorName,
        medications: meds,
        consultationDate: record.created_at,
        dispenseCode: record.dispense_code,
      });
    } catch (e) {
      console.error("[DoctorDetails] erreur génération ordonnance :", e);
      alert(
        "Impossible de générer l’ordonnance pour le moment. Réessayez plus tard."
      );
    }
  };

  const hasInsurer = !!record.insurer_id;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Détails de la consultation</h1>

      {isFlagged && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-800">
          Cette consultation fait l'objet d'une revue interne. Aucune action n'est requise de votre part pour le moment.
        </div>
      )}

      {/* Bloc infos générales */}
      <section className="bg-white rounded-xl shadow-sm p-4 space-y-1">
        <h2 className="font-semibold mb-2">Informations générales</h2>
        <p>
          <span className="font-medium">Patient :</span> {patientName}
        </p>
        <p>
          <span className="font-medium">Établissement :</span> {clinicName}
        </p>
        <p>
          <span className="font-medium">Médecin :</span> {doctorName}
        </p>
        <p>
          <span className="font-medium">Date :</span> {createdDate}
        </p>
        <p>
          <span className="font-medium">Montant :</span>{" "}
          {record.amount != null
            ? `${record.amount.toLocaleString("fr-FR")} FCFA`
            : "—"}
        </p>
      </section>

      {/* Bloc actes & diagnostic */}
      <section className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h2 className="font-semibold mb-2">Actes &amp; diagnostic</h2>

        <div>
          <p className="text-sm font-medium">Symptômes</p>
          <p className="text-sm text-gray-700">{record.symptoms || "—"}</p>
        </div>

        <div>
          <p className="text-sm font-medium">Diagnostic</p>
          <p className="text-sm text-gray-700">{record.diagnosis || "—"}</p>
        </div>

        <div>
          <p className="text-sm font-medium">Code affection</p>
          <p className="text-sm text-gray-700">{record.diagnosis_code_text || "—"}</p>
        </div>

        <div>
          <p className="text-sm font-medium mb-1">Actes facturés</p>
          {Array.isArray(record.acts) && record.acts.length > 0 ? (
            <ul className="list-disc pl-5 text-sm text-gray-700">
              {record.acts.map((a, i) => (
                <li key={i}>{[a.code, a.title].filter(Boolean).join(" — ") || "—"}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Aucun acte saisi.</p>
          )}
        </div>
      </section>

      {/* Bloc tarification -- ne s'affiche que si le calcul automatique n'a pas
          suffi (compute_consultation_pricing bloqué / contesté par l'assureur) */}
      {record.pricing_status && record.pricing_status !== "computed" && (
        <section className="bg-white rounded-xl shadow-sm p-4 space-y-2">
          <h2 className="font-semibold">Tarification</h2>

          {record.pricing_status === "manual_approved" ? (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
              <p className="text-sm font-semibold text-purple-800">
                Tarif ajusté manuellement et validé par l’assureur
              </p>
              <p className="text-sm text-purple-700 mt-1">
                Montant retenu : {record.insurer_amount != null ? `${record.insurer_amount.toLocaleString("fr-FR")} FCFA` : "—"}
              </p>
              {manualPricing?.justification && (
                <p className="text-xs text-purple-700 mt-2">Justification : {manualPricing.justification}</p>
              )}
            </div>
          ) : manualPricing ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                Tarification manuelle en attente de validation assureur
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Montant proposé : {manualPricing.proposed_amount.toLocaleString("fr-FR")} FCFA
              </p>
              {manualPricing.justification && (
                <p className="text-xs text-amber-700 mt-2">Justification : {manualPricing.justification}</p>
              )}
              {manualPricing.status === "rejected" && (
                <p className="text-xs text-red-700 mt-2">
                  Proposition rejetée{manualPricing.rejection_reason ? ` : ${manualPricing.rejection_reason}` : "."}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-700">
                Le calcul automatique du tarif n’a pas abouti pour cette consultation ; elle est en attente de
                tarification manuelle par l’assureur.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Bloc statut assureur */}
      <section className="bg-white rounded-xl shadow-sm p-4 space-y-4">
        <h2 className="font-semibold">Statut auprès de l’assureur</h2>

        {record.status === "accepted" && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-800">
              ✅ Consultation acceptée par l’assureur
            </p>
            <p className="text-sm text-green-700 mt-1">
              Cette consultation a été validée.
            </p>
            <p className="text-xs text-green-700 mt-2">
              Décision enregistrée le : {decisionDate}
            </p>
          </div>
        )}

        {record.status === "rejected" && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-800">
              ❌ Consultation rejetée par l’assureur
            </p>
            <p className="text-xs text-red-700 mt-2">
              Décision enregistrée le : {decisionDate}
            </p>

            <div className="mt-3">
              <p className="text-sm font-medium text-red-800">Motif du rejet</p>
              <p className="text-sm text-red-700 mt-1">
                {record.insurer_comment?.trim()
                  ? record.insurer_comment
                  : "Aucun motif n’a été renseigné par l’assureur."}
              </p>
            </div>
          </div>
        )}

        {record.status === "sent" && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm font-semibold text-yellow-800">
              ⏳ Consultation envoyée à l’assureur
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              En attente de décision.
            </p>
          </div>
        )}

        {!["accepted", "rejected", "sent"].includes(record.status) && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-800">
              Statut actuel : {record.status || "—"}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Décision enregistrée le : {decisionDate}
            </p>
          </div>
        )}

        <div className="space-y-1 text-sm">
          <p>
            <span className="font-medium">Statut brut :</span> {record.status}
          </p>

          <p>
            <span className="font-medium">Rapport PDF (assureur) :</span>{" "}
            {record.pdf_url ? (
              <a
                href={record.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline"
              >
                Ouvrir le rapport PDF
              </a>
            ) : (
              <span className="text-gray-500">Non disponible</span>
            )}
          </p>
        </div>
      </section>

      {/* Bloc médicaments + ordonnance */}
      <section className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h2 className="font-semibold mb-2">Médicaments prescrits</h2>
        {meds.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucun médicament enregistré pour cette consultation.
          </p>
        ) : (
          <ul className="list-disc pl-5">
            {meds.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        )}

        <Button
          className="mt-3 bg-green-600 hover:bg-green-700"
          onClick={handleGeneratePrescription}
          disabled={meds.length === 0}
        >
          Générer l’ordonnance PDF
        </Button>

        {record.dispense_code && (
          <div className="pt-3 mt-3 border-t space-y-3">
            <div>
              <p className="text-sm font-medium">Code de retrait pharmacie</p>
              <p className="font-mono text-lg tracking-widest">
                {record.dispense_code.replace(/(.{4})/g, "$1 ").trim()}
              </p>
              <p className="text-xs text-gray-500">
                Imprimé sur l’ordonnance. Valable dans n’importe quelle pharmacie du réseau.
              </p>
            </div>

            {delivery ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                ✅ Retirée le {new Date(delivery.delivered_at).toLocaleString()}
                {delivery.pharmacies?.name ? ` à ${delivery.pharmacies.name}` : ""}.
                {delivery.delivered_items.length < meds.length && (
                  <span className="block text-amber-700 mt-1">
                    ⚠️ Délivrance partielle ({delivery.delivered_items.length}/{meds.length} lignes).
                  </span>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Pharmacie associée (facultatif)
                </label>
                <select
                  className="border rounded px-3 py-2 text-sm w-full max-w-sm"
                  value={record.pharmacy_id || ""}
                  disabled={savingPharmacy}
                  onChange={(e) => handlePharmacyChange(e.target.value)}
                >
                  <option value="">— Aucune (le patient peut aller partout) —</option>
                  {pharmacies.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Non requis : le patient peut se présenter dans n’importe quelle pharmacie
                  avec le code ci-dessus. À ne renseigner que si vous voulez pré-signaler la
                  pharmacie choisie par le patient.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Bloc messagerie médecin ↔ assureur */}
      {hasInsurer ? (
        record.doctor_id ? (
          <section className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold mb-3">Messagerie avec l’assureur</h2>
            <ConsultationChatDoctor
              consultationId={record.id}
              senderId={record.doctor_id}     // clinic_staff.id (uuid)
              senderRole="doctor"
              receiverId={record.insurer_agent_id}
            />
        </section>
        ) : (
          <section className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold mb-2">Messagerie</h2>
            <p className="text-sm text-gray-500">
              Impossible d’activer la messagerie : aucun médecin (doctor_id) n’est associé à cette consultation.
            </p>
          </section>
        )
      ) : (
        <section className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold mb-2">Messagerie</h2>
          <p className="text-sm text-gray-500">
            Aucun assureur n’est associé à cette consultation — la messagerie
            n’est pas disponible.
          </p>
        </section>
      )}
    </div>
  );
}
