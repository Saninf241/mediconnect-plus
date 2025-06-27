// src/components/ui/button.tsx
import React from "react";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function Button({ children, ...props }: Props) {
  return (
    <button
      {...props}
      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
    >
      {children}
    </button>
  );
}
