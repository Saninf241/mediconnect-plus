// src/Pages/shared/doctor/NewPatientPage.tsx
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useDoctorContext } from "../../../hooks/useDoctorContext";
import { useDoctorScope } from "../../../hooks/useDoctorScope";
import { createPatientDraft } from "../../../lib/api/secretary";
import { supabase } from "../../../lib/supabase";
import { buildZKDeeplink } from "../../../lib/deeplink";

function getOriginForPhone(): string {
  const host = window.location.hostname;
  const isLocal =
    host === "localhost" ||
    /^127\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^10\./.test(host);
  if (isLocal) return import.meta.env.VITE_LAN_ORIGIN?.trim() || window.location.origin;
  return window.location.origin;
}

export default function NewPatientPage() {
  const doctorInfo = useDoctorContext();
  const { basePath } = useDoctorScope();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  // Vérification anti-doublon (scan avant création) : même garde-fou que
  // le wizard secrétaire, pour que la création médecin ne contourne pas
  // la protection contre les doublons.
  const [precheckDone, setPrecheckDone] = useState(false);
  const [precheckLoading, setPrecheckLoading] = useState(false);
  const [existingMatch, setExistingMatch] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idFound = params.get("id_found");
    const idNotFound = params.get("id_not_found");

    if (idFound) {
      (async () => {
        const { data } = await supabase
          .from("patients")
          .select("id, name")
          .eq("id", idFound)
          .maybeSingle();
        setExistingMatch({ id: idFound, name: data?.name ?? "Patient" });
      })();
    } else if (idNotFound) {
      setPrecheckDone(true);
    }

    if (idFound || idNotFound) {
      const clean = window.location.pathname + window.location.hash;
      window.history.replaceState(null, "", clean);
    }
  }, []);

  const runPrecheckScan = async () => {
    if (!doctorInfo?.clinic_id || !doctorInfo?.doctor_id) {
      toast.error("Impossible d'identifier votre cabinet.");
      return;
    }
    setPrecheckLoading(true);

    sessionStorage.setItem(
      "fp:return",
      window.location.pathname + window.location.search + window.location.hash
    );

    const { deeplink, intentUri } = buildZKDeeplink({
      mode: "identify",
      clinicId: doctorInfo.clinic_id,
      operatorId: doctorInfo.doctor_id,
      redirectOriginForPhone: getOriginForPhone(),
      redirectPath: "/fp-callback?scope=doctor_new_patient",
    });

    try {
      window.location.href = deeplink;
      setTimeout(() => {
        window.location.href = intentUri;
      }, 900);
    } catch {
      window.location.href = intentUri;
    }
    setPrecheckLoading(false);
  };

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    dob: "",
    phone: "",
    is_assured: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!doctorInfo?.clinic_id) {
      toast.error("Impossible d'identifier votre cabinet.");
      return;
    }
    if (!form.full_name.trim() || !form.dob) {
      toast.error("Nom et date de naissance requis.");
      return;
    }

    setSaving(true);
    try {
      const token = (await getToken().catch(() => null)) || "";

      const { patient_id } = await createPatientDraft(
        {
          full_name: form.full_name.trim(),
          dob: form.dob,
          sex: "O",
          national_id: null,
          email: null,
          phone: form.phone.trim(),
          is_assured: form.is_assured,
        },
        token,
        {
          clinic_id: doctorInfo.clinic_id,
          full_name: form.full_name.trim(),
          dob: form.dob,
          sex: "O",
          national_id: null,
          email: null,
          phone: form.phone.trim(),
          created_by: doctorInfo.doctor_id,
        }
      );

      toast.success("Patient créé avec succès");
      navigate(`${basePath}/patients/${patient_id}`);
    } catch (err: any) {
      console.error("[NewPatientPage] création patient échouée:", err);
      toast.error("Erreur lors de la création du patient.");
    } finally {
      setSaving(false);
    }
  };

  if (existingMatch) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow mt-6 space-y-4">
        <h2 className="text-xl font-bold text-emerald-900">Patient déjà enregistré</h2>
        <p className="text-sm text-emerald-900">
          <b>{existingMatch.name}</b> a été retrouvé par empreinte — aucune nouvelle fiche n'a
          été créée.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`${basePath}/patients/${existingMatch.id}`)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded"
          >
            Ouvrir le dossier
          </button>
          <button
            onClick={() => {
              setExistingMatch(null);
              setPrecheckDone(true);
            }}
            className="border px-4 py-2 rounded hover:bg-gray-50"
          >
            Ce n'est pas le bon patient — créer quand même
          </button>
        </div>
      </div>
    );
  }

  if (!precheckDone) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow mt-6 space-y-4">
        <h2 className="text-2xl font-bold text-center mb-2">Nouveau patient</h2>
        <p className="text-sm text-gray-600">
          Avant de créer une fiche, on vérifie si ce patient est déjà enregistré (dans ce
          cabinet ou dans un cabinet du même réseau assureur) pour éviter les doublons.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={runPrecheckScan}
            disabled={precheckLoading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded disabled:opacity-60"
          >
            {precheckLoading ? "Lancement..." : "Scanner l'empreinte"}
          </button>
          <button
            onClick={() => setPrecheckDone(true)}
            className="border px-4 py-2 rounded hover:bg-gray-50"
          >
            Pas de lecteur disponible — continuer sans vérifier
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow mt-6">
      <h2 className="text-2xl font-bold text-center mb-2">Enregistrer un nouveau patient</h2>
      <p className="text-sm text-gray-500 text-center mb-6">
        L'empreinte digitale sera capturée lors de la première consultation
        (ou via l'espace secrétaire si le cabinet en dispose un).
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nom complet</label>
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Date de naissance</label>
          <input
            type="date"
            value={form.dob}
            onChange={(e) => setForm({ ...form, dob: e.target.value })}
            required
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Téléphone</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full border rounded p-2"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_assured}
            onChange={(e) => setForm({ ...form, is_assured: e.target.checked })}
          />
          Patient assuré
        </label>

        {form.is_assured && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Cette fiche rapide ne lie pas encore le patient à son assureur. Pour activer la prise
            en charge, demandez à la secrétaire de compléter son dossier (numéro d'adhérent,
            vérification réseau) — sans ça, ses consultations resteront en brouillon.
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded disabled:opacity-60"
        >
          {saving ? "Enregistrement…" : "Enregistrer le patient"}
        </button>
      </form>
    </div>
  );
}
