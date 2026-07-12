// src/components/ui/LogoutButton.tsx
import { useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';

export default function LogoutButton() {
  const navigate = useNavigate();
  const { signOut } = useClerk();

  const handleLogout = async () => {
    try {
      localStorage.removeItem('establishmentUserSession');
      localStorage.removeItem('pharmacyUserSession');
    } catch (e) {
      console.warn('Storage cleanup failed', e);
    }

    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-red-600 hover:underline mt-4"
    >
      Se déconnecter
    </button>
  );
}
