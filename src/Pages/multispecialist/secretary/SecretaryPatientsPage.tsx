import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import Modal from "../../../components/ui/dialog";

interface Patient {
  id: string;
  name: string;
  phone?: string;
  birthdate?: string;
  is_assured?: boolean;
}

export default function SecretaryPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [newPatient, setNewPatient] = useState<Partial<Patient>>({});
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      const { data, error } = await supabase.from("patients").select("*");
      if (!error && data) setPatients(data);
    };
    fetchPatients();
  }, []);

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!newPatient.name) return;

    if (editingPatientId) {
      await supabase.from("patients").update(newPatient).eq("id", editingPatientId);
    } else {
      await supabase.from("patients").insert({ ...newPatient });
    }

    setNewPatient({});
    setEditingPatientId(null);
    setIsModalOpen(false);

    const { data, error } = await supabase.from("patients").select("*");
    if (!error && data) setPatients(data);
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
