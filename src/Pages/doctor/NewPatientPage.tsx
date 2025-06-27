// src/Pages/doctor/NewPatientPage.tsx
import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@clerk/clerk-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

export default function NewPatientPage() {
  const { user } = useUser();
  const navigate = useNavigate();

  const [fingerprintCaptured, setFingerprintCaptured] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    insurance_number: '',
    insurance_name: '',
    phone: '',
  });

  const doctorId = user?.id;

  const handleFingerprintCapture = () => {
    // 👉 Ici : intégrer ton vrai SDK de scanner
    // pour le dev : simulation simple
    setFingerprintCaptured(true);
    toast.success("Empreinte capturée avec succès");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!doctorId) {
      toast.error("Utilisateur médecin introuvable");
      return;
    }

    const { error } = await supabase
      .from('patients')
      .insert([{
        ...formData,
        doctor_id: doctorId,
        fingerprint_missing: false, // car empreinte capturée
      }]);

    if (error) {
      toast.error("Erreur lors de la création du patient");
    } else {
      toast.success("Patient créé avec succès");
      navigate('/doctor/patients');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow mt-6">
      <h2 className="text-2xl font-bold text-center mb-6">Enregistrement d’un nouveau patient</h2>

      {!fingerprintCaptured ? (
        <div className="flex flex-col items-center space-y-4">
          <p className="text-gray-700">Veuillez capturer l’empreinte du patient pour continuer.</p>
          <button
            onClick={handleFingerprintCapture}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded"
          >
            Capturer l’empreinte
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label>Nom</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label>Prénom</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label>Date de naissance</label>
            <input
              type="date"
              name="birth_date"
              value={formData.birth_date}
              onChange={handleChange}
              required
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label>Numéro d’assurance</label>
            <input
              type="text"
              name="insurance_number"
              value={formData.insurance_number}
              onChange={handleChange}
              required
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label>Nom de l’assurance</label>
            <input
              type="text"
              name="insurance_name"
              value={formData.insurance_name}
              onChange={handleChange}
              required
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label>Téléphone</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full border rounded p-2"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-4 rounded"
          >
            Enregistrer le patient
          </button>
        </form>
      )}
    </div>
  );
}
