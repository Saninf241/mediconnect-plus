import { Outlet } from 'react-router-dom';
import LogoutButton from "../ui/LogoutButton";

export default function MultispecialistDoctorLayout() {
  return (
    <div className="flex">
      <aside className="w-64 bg-blue-800 text-white h-screen p-4">
        <h2 className="text-xl font-bold mb-6">Espace Médecin</h2>
        <ul className="space-y-4">
          <li><a href="/multispecialist/doctor/dashboard">Dashboard</a></li>
          <li><a href="/multispecialist/doctor/patients">Mes Patients</a></li>
          <li><a href="/multispecialist/doctor/new-consultation">Nouvelle consultation</a></li>
          <li><a href="/multispecialist/doctor/consultation-follow-up">Suivi des consultations</a></li>
          <li><a href="/multispecialist/doctor/performance">Performance</a></li>
          <li><a href="/multispecialist/doctor/settings">Paramètres</a></li>
        </ul>

        <div className="mt-6">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-6 bg-gray-100">
        <Outlet />
      </main>
    </div>
  );
}
