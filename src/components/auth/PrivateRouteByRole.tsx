// src/components/auth/PrivateRouteByRole.tsx
import React from "react";
import { Navigate } from "react-router-dom";

type Props = {
  allowedRole: string;
  children: React.ReactNode;
  establishmentUser: {
    role: string;
    [key: string]: any;
  } | null;
};

export default function PrivateRouteByRole({
  allowedRole,
  children,
  establishmentUser,
}: Props) {
  if (!establishmentUser) {
    console.warn("🚫 Aucun utilisateur connecté.");
    return <Navigate to="/unauthorized" />;
  }

  const { role } = establishmentUser;
  console.log("🔍 Rôle utilisateur:", role);
  console.log("✅ Rôle requis:", allowedRole);

  if (role !== allowedRole) {
    console.warn("⛔️ Rôle non autorisé");
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
}
