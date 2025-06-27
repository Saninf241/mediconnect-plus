// src/components/Layout.tsx
import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { EstablishmentUser } from '@/lib/auth';

interface LayoutProps {
  children: React.ReactNode;
  onLogout?: () => void;
  establishmentUser?: EstablishmentUser | null;
}

export function Layout({ children, onLogout, establishmentUser }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogoClick = () => {
    if (onLogout && establishmentUser) {
      onLogout(); // déconnecte l’établissement si connecté
    }
    navigate('/'); // va vers la landing page
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50 to-white">
      <header className="bg-white shadow sticky top-0 z-50">
        <div className="flex justify-between items-center px-4 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden">
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <span
              onClick={handleLogoClick}
              className="cursor-pointer text-xl font-bold bg-gradient-to-r from-emerald-600 to-sky-600 bg-clip-text text-transparent"
            >
              MediConnect+
            </span>
          </div>

          {establishmentUser && (
            <div className="flex items-center gap-4 text-sm text-gray-700">
              {establishmentUser.name} ({establishmentUser.role})
              <button
                onClick={onLogout}
                className="text-emerald-600 hover:underline"
              >
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
