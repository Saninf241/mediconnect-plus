// src/components/ui/Switch.tsx
import React from "react";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: () => void;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onCheckedChange }) => {
  return (
    <button
      onClick={onCheckedChange}
      className={`w-12 h-6 rounded-full transition-colors ${
        checked ? "bg-green-500" : "bg-gray-300"
      }`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
};
