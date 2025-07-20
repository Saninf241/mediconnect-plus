import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Button } from "../../../components/ui/button";
import { toast } from "sonner";

export default function SupportPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // À adapter si tu as un contexte utilisateur plus précis
  const clinic_id = localStorage.getItem("clinic_id");
  const secretary_id = localStorage.getItem("user_id");

  const determineTarget = (subject: string) => {
    const internal = ["patient", "consultation", "paiement"];
    return internal.includes(subject.toLowerCase()) ? "admin" : "support";
  };

  const handleSubmit = async () => {
    if (!subject || !message) {
      toast.error("Veuillez remplir tous les champs.");
      return;
    }

    setIsLoading(true);
    const target = determineTarget(subject);

    const { error } = await supabase.from("support_requests").insert({
      clinic_id,
      secretary_id,
      subject,
      message,
      target,
    });

    setIsLoading(false);
    if (error) {
      toast.error("Erreur lors de l'envoi du message.");
    } else {
      toast.success("Message envoyé avec succès");
      setSubject("");
      setMessage("");
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">
      <h2 className="text-xl font-semibold">Contacter le support</h2>
      <select
        className="w-full border rounded p-2"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      >
        <option value="">Choisir un sujet</option>
        <option value="Patient">Patient</option>
        <option value="Consultation">Consultation</option>
        <option value="Paiement">Paiement</option>
        <option value="Problème technique">Problème technique</option>
        <option value="Autre">Autre</option>
      </select>
      <Textarea
        placeholder="Expliquez votre problème ici..."
        rows={6}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <Button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? "Envoi en cours..." : "Envoyer"}
      </Button>
    </div>
  );
}
