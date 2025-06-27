// src/components/ui/card.tsx
import React from "react";

interface Props {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: Props) {
  return (
    <div className={`bg-white shadow p-4 rounded ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({ children }: Props) {
  return <div className="p-2">{children}</div>;
}
