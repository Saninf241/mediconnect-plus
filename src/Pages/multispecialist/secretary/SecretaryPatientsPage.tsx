import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import Modal from "../../../components/ui/dialog";
import { toast } from "react-toastify";
import { useClinicId } from "../../../hooks/useClinicId";

interface Patient {
  id: string;
  name: string;
  phone?: string;
  birthdate?: string;
  is_assured?: boolean;
}

export default function SecretaryPatientsPage() {
  const { clinicId } = useClinicId();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [newPatient, setNewPatient] = useState<Partial<Patient>>({});
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPatients = async () => {
    if (!clinicId) return;
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("clinic_id", clinicId);
    if (!error && data) setPatients(data);
    if (error) console.error("[SecretaryPatientsPage] fetch error:", error);
  };

  useEffect(() => {
    fetchPatients();
  }, [clinicId]);

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!newPatient.name) return;
    if (!clinicId) {
      toast.error("Impossible d'identifier votre cabinet.");
      return;
    }

    const { error } = editingPatientId
      ? await supabase.from("patients").update(newPatient).eq("id", editingPatientId)
      : await supabase.from("patients").insert({ ...newPatient, clinic_id: clinicId });

    if (error) {
      console.error("[SecretaryPatientsPage] save error:", error);
      toast.error("Erreur lors de l'enregistrement du patient.");
      return;
    }

    setNewPatient({});
    setEditingPatientId(null);
    setIsModalOpen(false);

    await fetchPatients();
  };

  const openEdit = (patient: Patient) => {
    setNewPatient(patient);
    setEditingPatientId(patient.id);
    setIsModalOpen(true);
  };

  const openNewPatient = () => {
    setNewPatient({});
    setEditingPatientId(null);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <Input
          placeholder="Rechercher un patient"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Button onClick={openNewPatient}>Nouveau patient</Button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPatientId ? "Modifier le patient" : "Ajouter un patient"}>
        <div className="space-y-3">
          <Input
            placeholder="Nom"
            value={newPatient.name || ""}
            onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
          />
          <Input
            placeholder="Téléphone"
            value={newPatient.phone || ""}
            onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
          />
          <Input
            type="date"
            value={newPatient.birthdate || ""}
            onChange={(e) => setNewPatient({ ...newPatient, birthdate: e.target.value })}
          />
          <label className="flex gap-2 items-center">
            <input
              type="checkbox"
              checked={newPatient.is_assured || false}
              onChange={(e) => setNewPatient({ ...newPatient, is_assured: e.target.checked })}
            />
            Assuré
          </label>
          <Button onClick={handleSave}>
            {editingPatientId ? "Mettre à jour" : "Ajouter"}
          </Button>
        </div>
      </Modal>

      <ul className="space-y-2">
        {filteredPatients.map((p) => (
          <li
            key={p.id}
            className="border p-2 rounded hover:bg-gray-100 flex justify-between items-center"
          >
            <div>
              <div className="font-semibold">{p.name}</div>
              <div className="text-sm text-gray-500">
                📞 {p.phone || "-"} | 🎂 {p.birthdate || "-"} | {p.is_assured ? "✅ Assuré" : "❌ Non assuré"}
              </div>
            </div>
            <Button onClick={() => openEdit(p)}>
              Modifier
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
