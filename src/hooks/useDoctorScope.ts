import { useLocation } from "react-router-dom";

export type DoctorScope = {
  basePath: "/doctor" | "/multispecialist/doctor";
  fingerprintScope: "doctor_specialist" | "doctor_multi";
  /** Chemin complet vers le flux de démarrage de consultation — le nom du segment
   * diffère entre les deux arbres ("new-act" vs "new-consultation"), donc basePath seul ne suffit pas. */
  newConsultationPath: "/doctor/new-act" | "/multispecialist/doctor/new-consultation";
  isMultispecialist: boolean;
};

export function useDoctorScope(): DoctorScope {
  const location = useLocation();
  const isMultispecialist = location.pathname.startsWith("/multispecialist");

  return {
    basePath: isMultispecialist ? "/multispecialist/doctor" : "/doctor",
    fingerprintScope: isMultispecialist ? "doctor_multi" : "doctor_specialist",
    newConsultationPath: isMultispecialist
      ? "/multispecialist/doctor/new-consultation"
      : "/doctor/new-act",
    isMultispecialist,
  };
}
