import React, { useState } from 'react';
import { PatientAuth } from './PatientAuth';
import { PatientDashboard } from './PatientDashboard';

export function PatientPortal() {
  const [authenticatedPatientId, setAuthenticatedPatientId] = useState<string | null>(null);

  const handleAuthSuccess = (patientId: string) => {
    setAuthenticatedPatientId(patientId);
  };

  const handleLogout = () => {
    setAuthenticatedPatientId(null);
  };

  return authenticatedPatientId ? (
    <PatientDashboard patientId={authenticatedPatientId} onLogout={handleLogout} />
  ) : (
    <PatientAuth onAuthSuccess={handleAuthSuccess} />
  );
}