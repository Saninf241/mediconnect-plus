// src/components/auth/PatientPrivateRoute.tsx
import { Navigate } from "react-router-dom";
import { usePatientSession } from "../../hooks/usePatientSession";

export default function PatientPrivateRoute({ children }: React.PropsWithChildren<{}>) {
  const { session, loading } = usePatientSession();

  if (loading) {
    return <div style={{ padding: 24 }}>Chargement…</div>;
  }

  if (!session) {
    return <Navigate to="/patient/login" replace />;
  }

  return <>{children}</>;
}
