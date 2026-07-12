// src/components/ui/card.tsx
import React from "react";

interface Props {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", onClick }: Props) {
  return (
    <div className={`bg-white shadow p-4 rounded ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

export function CardContent({ children }: Props) {
  return <div className="p-2">{children}</div>;
}
