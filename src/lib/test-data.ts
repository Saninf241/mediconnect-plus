// Données de test pour les développeurs
export const testPatients = [
  {
    id: 'TEST-PATIENT-1',
    name: 'Jean Dupont',
    dateOfBirth: '1980-05-15',
    insuranceNumber: 'ASS123456789',
    email: 'jean.dupont@test.com',
    phone: '0612345678',
    address: '123 Rue de Test, Libreville',
    insurance_provider: 'CNAMGS',
    insurance_type: 'insured',
    insurance_status: 'active',
    medical_history: {
      allergies: 'Pénicilline',
      chronicConditions: 'Hypertension artérielle',
      currentMedications: 'Amlodipine 5mg',
      previousSurgeries: 'Appendicectomie (2010)'
    }
  },
  {
    id: 'TEST-PATIENT-2',
    name: 'Marie Martin',
    dateOfBirth: '1992-08-23',
    email: 'marie.martin@test.com',
    phone: '0687654321',
    address: '456 Avenue des Tests, Port-Gentil',
    insurance_provider: null,
    insurance_type: null,
    insurance_status: null,
    medical_history: {
      allergies: 'Aucune',
      chronicConditions: 'Asthme léger',
      currentMedications: 'Ventoline (si besoin)',
      previousSurgeries: 'Aucune'
    }
  }
];

export const testConsultations = [
  {
    id: 'TEST-CONSULT-1',
    patientId: 'TEST-PATIENT-1',
    doctorId: 'TEST-DOCTOR-1',
    symptoms: 'Maux de tête, fatigue, vertiges occasionnels',
    diagnosis: 'Migraine chronique avec composante tensionnelle',
    notes: 'Patient stressé par son travail. Recommandation de techniques de relaxation.',
    status: 'completed',
    created_at: '2024-02-10T09:30:00.000Z',
    consultation_type: 'routine',
    amount: 25000, // Prix en FCFA
    clinic_staff: {
      name: 'Dr. Sophie Martin',
      speciality: 'Neurologie'
    },
    consultation_medications: [
      {
        name: 'Doliprane',
        dosage: '1000mg',
        form: 'comprimé',
        price: 2500 // Prix en FCFA
      },
      {
        name: 'Laroxyl',
        dosage: '25mg',
        form: 'gouttes',
        price: 3500 // Prix en FCFA
      }
    ],
    consultation_examinations: [
      {
        name: 'IRM cérébrale',
        category: 'Imagerie',
        status: 'completed',
        results: 'Absence d\'anomalie significative',
        price: 75000 // Prix en FCFA
      },
      {
        name: 'Bilan sanguin',
        category: 'Biologie',
        status: 'pending',
        price: 15000 // Prix en FCFA
      }
    ],
    insurance_coverage: {
      provider: 'CNAMGS',
      coverage_rate: 0.8,
      patient_share: 0.2
    }
  },
  {
    id: 'TEST-CONSULT-2',
    patientId: 'TEST-PATIENT-1',
    doctorId: 'TEST-DOCTOR-2',
    symptoms: 'Toux persistante, fièvre légère, fatigue',
    diagnosis: 'Bronchite aiguë',
    notes: 'Évolution favorable sous traitement antibiotique',
    status: 'completed',
    created_at: '2024-02-05T14:15:00.000Z',
    consultation_type: 'suivi',
    amount: 15000, // Prix en FCFA
    clinic_staff: {
      name: 'Dr. Pierre Dubois',
      speciality: 'Pneumologie'
    },
    consultation_medications: [
      {
        name: 'Augmentin',
        dosage: '1g',
        form: 'comprimé',
        price: 4500 // Prix en FCFA
      },
      {
        name: 'Drill',
        dosage: '200ml',
        form: 'sirop',
        price: 3000 // Prix en FCFA
      }
    ],
    consultation_examinations: [
      {
        name: 'Radiographie thoracique',
        category: 'Imagerie',
        status: 'completed',
        results: 'Infiltrats bronchiques bilatéraux',
        price: 25000 // Prix en FCFA
      }
    ],
    insurance_coverage: {
      provider: 'CNAMGS',
      coverage_rate: 0.8,
      patient_share: 0.2
    }
  },
  {
    id: 'TEST-CONSULT-3',
    patientId: 'TEST-PATIENT-2',
    doctorId: 'TEST-DOCTOR-1',
    symptoms: 'Toux, fièvre 38.5°C, courbatures',
    diagnosis: 'Syndrome grippal',
    notes: 'Traitement symptomatique et repos recommandé',
    status: 'in_progress',
    created_at: '2024-02-13T10:00:00.000Z',
    consultation_type: 'urgence',
    amount: 35000, // Prix en FCFA
    clinic_staff: {
      name: 'Dr. Marie Lambert',
      speciality: 'Médecine générale'
    },
    consultation_medications: [
      {
        name: 'Paracétamol',
        dosage: '500mg',
        form: 'comprimé',
        price: 1500 // Prix en FCFA
      },
      {
        name: 'Oscillococcinum',
        dosage: '1 dose',
        form: 'granules',
        price: 5000 // Prix en FCFA
      }
    ],
    consultation_examinations: [
      {
        name: 'Test PCR Grippe',
        category: 'Biologie',
        status: 'pending',
        price: 20000 // Prix en FCFA
      }
    ]
  }
];

export const testMedications = [
  {
    id: 'TEST-MED-1',
    name: 'Doliprane',
    dosage: '1000mg',
    form: 'comprimé',
    price: 2500 // Prix en FCFA
  },
  {
    id: 'TEST-MED-2',
    name: 'Ibuprofène',
    dosage: '400mg',
    form: 'gélule',
    price: 3000 // Prix en FCFA
  }
];

export const testExaminations = [
  {
    id: 'TEST-EXAM-1',
    name: 'Radiographie pulmonaire',
    category: 'Imagerie',
    price: 25000 // Prix en FCFA
  },
  {
    id: 'TEST-EXAM-2',
    name: 'Prise de sang',
    category: 'Biologie',
    price: 15000 // Prix en FCFA
  }
];

export const testMedicalCodes = [
  {
    code_type: 'ICD-10',
    code: 'R51',
    description: 'Céphalée'
  },
  {
    code_type: 'ICD-10',
    code: 'J11',
    description: 'Grippe, virus non identifié'
  },
  {
    code_type: 'CCAM',
    code: 'YYYY010',
    description: 'Consultation standard'
  }
];