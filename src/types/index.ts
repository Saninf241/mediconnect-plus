export interface Clinic {
  id: string;
  name: string;
  logo?: string;
  theme: {
    primary: string;
    secondary: string;
  };
  digitalStamp?: string;
}

interface User {
  id: string;
  clinicId: string;
  role: 'doctor' | 'secretary' | 'admin' | 'insurance' | 'developer';
  name: string;
  email: string;
  biometricId?: string;
}

export interface Patient {
  id: string;
  name: string;
  dateOfBirth: string;
  insuranceNumber?: string;
  biometricId?: string;
}

interface Consultation {
  id: string;
  patientId: string;
  doctorId: string;
  clinicId: string;
  date: string;
  symptoms: string[];
  diagnosis: string;
  icdCodes: string[];
  status: 'pending' | 'completed' | 'cancelled';
  isUrgent: boolean;
}

interface BiometricVerification {
  status: 'pending' | 'success' | 'failed';
  message?: string;
  userId?: string;
}