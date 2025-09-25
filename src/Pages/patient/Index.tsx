import { useAuth } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const PatientDashboard = () => {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSignedIn) {
      navigate("/patient/login");
    }
  }, [isSignedIn, navigate]);

  if (!isSignedIn) return null;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Bienvenue dans votre espace patient</h1>
      {/* Tableau récap ici */}
    </div>
  );
};

export default PatientDashboard;
