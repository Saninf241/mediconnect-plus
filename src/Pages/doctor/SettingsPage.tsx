import { useEffect, useState } from "react";
import { supabase } from '../../lib/supabase';
import { useUser } from "@clerk/clerk-react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { toast } from "react-toastify";

export default function SettingsPage() {
  const { user } = useUser();
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [bio, setBio] = useState(user?.publicMetadata?.bio ?? "");
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) return;

      const email = user.emailAddresses?.[0]?.emailAddress;
      const { data: staff } = await supabase
        .from("clinic_staff")
        .select("clinic_id")
        .eq("email", email)
        .maybeSingle();

      if (staff?.clinic_id) {
        const { data: clinic } = await supabase
          .from("clinics")
          .select("subscription_plan")
          .eq("id", staff.clinic_id)
          .maybeSingle();

        setSubscriptionPlan(clinic?.subscription_plan ?? null);
      }
    };

    fetchSubscription();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setProfilePicture(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    try {
      if (!user) return;

      if (profilePicture) {
        const { error: uploadError } = await supabase.storage
          .from("doctor-profiles")
          .upload(`doctor-${user.id}/profile.jpg`, profilePicture, {
            upsert: true,
          });
        if (uploadError) throw uploadError;
      }

      await user.update({
        unsafeMetadata: { bio },
      });

      toast.success("Paramètres mis à jour avec succès");
      setProfilePicture(null);
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    }
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-blue-700">⚙️ Paramètres du profil</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Photo de profil</label>
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </div>

        <div>
          <label className="block text-sm font-medium">Bio / Description</label>
          <Input
            type="text"
            value={bio as string}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        <Button onClick={handleSave} className="bg-emerald-600 text-white">
          Enregistrer
        </Button>
      </div>

      {/* 👇 Onboarding Vidéo Express */}
      <div className="mt-10 space-y-4">
        <h2 className="text-xl font-semibold text-blue-600">🎓 Onboarding express</h2>
        <p className="text-gray-600">
          3 vidéos pour maîtriser Mediconnect+ en moins de 10 minutes :
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <p className="font-medium text-sm">1. Comment envoyer un acte ?</p>
            <iframe
              src="https://www.youtube.com/embed/VID1_ID"
              className="w-full h-48 rounded"
              allowFullScreen
              title="Envoyer un acte"
            />
          </div>

          <div className="space-y-2">
            <p className="font-medium text-sm">2. Suivre ses paiements</p>
            <iframe
              src="https://www.youtube.com/embed/VID2_ID"
              className="w-full h-48 rounded"
              allowFullScreen
              title="Suivre les paiements"
            />
          </div>

          <div className="space-y-2">
            <p className="font-medium text-sm">3. Résoudre un rejet</p>
            <iframe
              src="https://www.youtube.com/embed/VID3_ID"
              className="w-full h-48 rounded"
              allowFullScreen
              title="Résolution d’un rejet"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
