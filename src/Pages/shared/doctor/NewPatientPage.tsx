// src/Pages/shared/doctor/NewPatientPage.tsx
import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useDoctorContext } from "../../../hooks/useDoctorContext";
import { useDoctorScope } from "../../../hooks/useDoctorScope";
import { createPatientDraft } from "../../../lib/api/secretary";

export default function NewPatientPage() {
  const doctorInfo = useDoctorContext();
  const { basePath } = useDoctorScope();
  const { getToken } = useAuth();
  const navigate = useNavigate();

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
