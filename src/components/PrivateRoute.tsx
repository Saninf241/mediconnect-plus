// src/components/PrivateRoute.tsx
import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { EstablishmentUser } from '../lib/auth';

interface PrivateRouteProps {
  children: ReactNode;
  establishmentUser: EstablishmentUser | null;
}

export function PrivateRoute({ children, establishmentUser }: PrivateRouteProps) {
  if (!establishmentUser) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
