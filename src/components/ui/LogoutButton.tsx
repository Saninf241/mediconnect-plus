// src/components/ui/LogoutButton.tsx
import { useNavigate } from 'react-router-dom';

export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('establishmentUserSession');
    navigate('/');
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
