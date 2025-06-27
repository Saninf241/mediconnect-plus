// src/components/interfaces/DoctorInterface.tsx
import { useState } from 'react';
import NewActPage from '../../pages/doctor/NewActPage';
import AddPatientModal from '../ui/uidoctor/AddPatientModal';
import SearchPatient from '../ui/uidoctor/SearchPatient';
import { Button } from '../ui/button';
import DoctorDashboard from '../../pages/doctor/DoctorDashboard';

export default function DoctorInterface() {
  const [view, setView] = useState<'dashboard' | 'consult' | 'add' | 'search'>('dashboard');

  return (
    <div className="p-6 space-y-6">
      {/* Menu principal */}
      <div className="flex gap-4">
        <Button variant={view === 'dashboard' ? "default" : "outline"} onClick={() => setView('dashboard')}>
          🏠 Tableau de bord
        </Button>
        <Button variant={view === 'consult' ? "default" : "outline"} onClick={() => setView('consult')}>
          🩺 Nouvelle consultation
        </Button>
        <Button variant={view === 'search' ? "default" : "outline"} onClick={() => setView('search')}>
          🔍 Rechercher patient
        </Button>
        <Button variant={view === 'add' ? "default" : "outline"} onClick={() => setView('add')}>
          ➕ Ajouter patient
        </Button>
      </div>

      {/* Affichage de la vue sélectionnée */}
      <div className="bg-white p-4 rounded-xl shadow">
        {view === 'dashboard' && <DoctorDashboard />}
        {view === 'consult' && <NewActPage />}
        {view === 'search' && <SearchPatient />}
        {view === 'add' && <AddPatientModal onClose={() => setView('dashboard')} />}
      </div>
    </div>
  );
}
