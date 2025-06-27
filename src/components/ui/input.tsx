// src/components/ui/input.tsx
import React from "react";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input(props: Props) {
  return (
    <input
      {...props}
      className="border px-3 py-2 rounded w-full text-sm text-gray-800"
    />
  );
}
