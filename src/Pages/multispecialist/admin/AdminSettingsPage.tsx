// src/Pages/multispecialist/admin/AdminSettingsPage.tsx
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useClinicId } from "../../../hooks/useClinicId";
import { Card, CardContent } from "../../../components/ui/card";

interface ClinicRow {
  id: string;
  name?: string | null;
  type?: string | null;
  phone?: string | null;
  address?: string | null;
}

interface SettingsForm {
  name: string;
  phone: string;
  address: string;
}

function clinicTypeLabel(type: string | null | undefined) {
  const t = (type ?? "").toLowerCase();

  if (t === "multispecialist_office") return "Cabinet multi-spécialiste";
  if (t === "specialist_office") return "Cabinet spécialiste";
  if (t === "clinic") return "Clinique";
  return type || "-";
}

export default function AdminSettingsPage() {
  const { clinicId, loadingClinic } = useClinicId();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [note, setNote] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [clinic, setClinic] = useState<ClinicRow | null>(null);
  const [form, setForm] = useState<SettingsForm>({
    name: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    if (loadingClinic) return;

    const fetchClinic = async () => {
      setLoading(true);
      setNote(null);
      setSuccessMessage(null);

      try {
        if (!clinicId) {
          setNote("Impossible de charger les paramètres de cet établissement.");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("clinics")
          .select("id, name, type, phone, address")
          .eq("id", clinicId)
          .maybeSingle();

        if (error) {
          console.error("[AdminSettingsPage] clinic fetch error:", error);
          setNote("Erreur lors du chargement des paramètres.");
          setClinic(null);
          setLoading(false);
          return;
        }

        if (!data) {
          setNote("Aucun établissement trouvé pour ce compte.");
          setClinic(null);
          setLoading(false);
          return;
        }

        const clinicData = data as ClinicRow;
        setClinic(clinicData);

        setForm({
          name: clinicData.name ?? "",
          phone: clinicData.phone ?? "",
          address: clinicData.address ?? "",
        });
      } catch (error) {
        console.error("[AdminSettingsPage] unexpected fetch error:", error);
        setNote("Une erreur inattendue est survenue.");
      } finally {
        setLoading(false);
      }
    };

    fetchClinic();
  }, [clinicId, loadingClinic]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    setNote(null);
    setSuccessMessage(null);

    if (!clinicId) {
      setNote("Aucun établissement détecté.");
      return;
    }

    if (!form.name.trim()) {
      setNote("Le nom de l’établissement est obligatoire.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      };

      const { error } = await supabase
        .from("clinics")
        .update(payload)
        .eq("id", clinicId);

      if (error) {
        console.error("[AdminSettingsPage] clinic update error:", error);
        setNote("Impossible d’enregistrer les paramètres.");
        setSaving(false);
        return;
      }

      setClinic((prev) =>
        prev
          ? {
              ...prev,
              ...payload,
            }
          : prev
      );

      setSuccessMessage("Paramètres enregistrés avec succès.");
    } catch (error) {
      console.error("[AdminSettingsPage] unexpected save error:", error);
      setNote("Une erreur inattendue est survenue lors de l’enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingClinic || loading) {
    return <div className="p-6">Chargement des paramètres…</div>;
  }

  return (
    <div className="space-y-6">
      {note && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {note}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Paramètres & accès</h1>
        <p className="text-sm text-gray-500">
          Informations administratives et règles simples d’accès de l’établissement.
        </p>
      </div>

      {/* Résumé établissement */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Établissement</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {clinic?.name || "Non renseigné"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Type</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {clinicTypeLabel(clinic?.type)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">ID établissement</p>
            <p className="mt-1 text-sm font-medium text-gray-700 break-all">
              {clinic?.id || clinicId || "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Formulaire */}
      <Card>
        <CardContent className="p-4">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Informations administratives
            </h2>
            <p className="text-sm text-gray-500">
              Modifie les informations générales visibles pour la gestion de l’établissement.
            </p>
          </div>

          <form onSubmit={handleSave} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Nom de l’établissement
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nom du cabinet"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Email principal
              </label>
              <input
                type="email"
                value=""
                disabled
                placeholder="Champ non disponible dans la table clinics"
                className="mt-1 w-full rounded-lg border bg-gray-100 px-3 py-2 text-sm text-gray-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Téléphone principal
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+241 ..."
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Adresse
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Adresse du cabinet"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Règles d'accès */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Rappels d’accès
            </h2>

            <div className="space-y-3 text-sm text-gray-700">
              <div className="rounded-lg bg-blue-50 px-4 py-3">
                <p className="font-medium text-blue-800">Admin</p>
                <p className="text-blue-700">
                  Accès au pilotage global, aux paiements, aux alertes, à l’équipe et aux paramètres.
                </p>
              </div>

              <div className="rounded-lg bg-amber-50 px-4 py-3">
                <p className="font-medium text-amber-800">Secrétaire</p>
                <p className="text-amber-700">
                  Accès administratif aux patients et à la préparation des parcours, sans accès aux décisions de direction.
                </p>
              </div>

              <div className="rounded-lg bg-green-50 px-4 py-3">
                <p className="font-medium text-green-800">Médecin</p>
                <p className="text-green-700">
                  Accès à la consultation, à ses dossiers et à ses échanges métier, selon son périmètre.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Bonnes pratiques
            </h2>

            <div className="space-y-3 text-sm text-gray-700">
              <div className="rounded-lg border px-4 py-3">
                <p className="font-medium text-gray-900">Limiter les admins</p>
                <p className="text-gray-600">
                  Garde un nombre réduit d’administrateurs pour éviter les erreurs de configuration.
                </p>
              </div>

              <div className="rounded-lg border px-4 py-3">
                <p className="font-medium text-gray-900">Utiliser des emails professionnels</p>
                <p className="text-gray-600">
                  Cela facilite le suivi des accès et la cohérence de l’équipe.
                </p>
              </div>

              <div className="rounded-lg border px-4 py-3">
                <p className="font-medium text-gray-900">Gérer l’équipe depuis la page dédiée</p>
                <p className="text-gray-600">
                  L’ajout et la suppression des membres se font dans la page Équipe.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
