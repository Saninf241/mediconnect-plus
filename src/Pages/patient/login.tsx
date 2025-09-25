import { SignIn } from "@clerk/clerk-react";

const PatientLogin = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-xl p-6 shadow-xl max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Connexion Patient</h1>
        <SignIn
          path="/patient/login"
          routing="path"
          signUpUrl="/patient/register"
          redirectUrl="/patient"
        />
      </div>
    </div>
  );
};

export default PatientLogin;
