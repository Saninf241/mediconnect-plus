// components/ui/uidoctor/ConsultationStatusFilters.tsx

import { Button } from "../button";

interface Props {
  current: string | null;
  onChange: (value: string | null) => void;
}

const statuses = ["draft", "sent", "accepted", "rejected", "paid"];

export default function ConsultationStatusFilters({ current, onChange }: Props) {
  return (
    <div className="flex gap-2 flex-wrap mb-4">
      {statuses.map((s) => (
        <Button
          key={s}
          onClick={() => onChange(s)}
          className={
            current === s
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-300 text-gray-700"
          }
        >
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </Button>
      ))}
      <Button
        onClick={() => onChange(null)}
        className={
          current === null
            ? "bg-blue-600 text-white"
            : "bg-white border border-gray-300 text-gray-700"
        }
      >
        Tous
      </Button>
    </div>
  );
}
