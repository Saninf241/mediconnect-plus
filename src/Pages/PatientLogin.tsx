import { SignIn } from "@clerk/clerk-react";

export default function PatientLogin() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-teal-500 to-blue-700">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-center text-gray-800">Connexion Patient</h2>
        <SignIn
          appearance={{
            elements: {
              card: "shadow-none border-none",
            },
          }}
          redirectUrl="/patient"
        />
      </div>
    </div>
  );
}
