// src/components/ui/ClinicPaymentInfoCard.tsx
// Soumission/consultation des coordonnees de paiement du cabinet (RIB ou
// mobile money). Reserve a l'admin (cabinet multi-specialiste) ou au
// medecin (cabinet specialiste solo, pas de role admin distinct). Ne
// s'affiche pas du tout pour les autres roles (secretaire, medecin
// non-admin d'un cabinet multi-specialiste).
import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";
import { toast } from "react-toastify";
import { Card } from "./card";
import { Button } from "./button";
import { supabase } from "../../lib/supabase";

const FUNCTIONS_BASE = "https://zwxegqevthzfphdqtjew.supabase.co/functions/v1";

type PaymentInfo = {
  id: string;
  payment_method: "bank_transfer" | "mobile_money";
  bank_name: string | null;
  account_number: string | null;
  account_holder_name: string | null;
  mobile_money_provider: string | null;
  mobile_money_number: string | null;
  status: "pending" | "verified" | "rejected";
  submitted_at: string | null;
  rejection_reason: string | null;
};

function statusBadge(status: PaymentInfo["status"]) {
  if (status === "verified") return { text: "Vérifié ✅", tone: "bg-green-100 text-green-800" };
  if (status === "rejected") return { text: "Rejeté ⚠️", tone: "bg-red-100 text-red-800" };
  return { text: "En attente de vérification ⏳", tone: "bg-yellow-100 text-yellow-800" };
}

export default function ClinicPaymentInfoCard() {
  const { user } = useUser();
  const { getToken } = useAuth();

  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [current, setCurrent] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [method, setMethod] = useState<"bank_transfer" | "mobile_money">("bank_transfer");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [momoProvider, setMomoProvider] = useState("");
  const [momoNumber, setMomoNumber] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);

      const email = user.emailAddresses?.[0]?.emailAddress ?? null;
      const { data: staff } = await supabase
        .from("clinic_staff")
        .select("clinic_id, role")
        .eq("clerk_user_id", user.id)
        .maybeSingle();

      const staffRow =
        staff ??
        (email
          ? (await supabase.from("clinic_staff").select("clinic_id, role").eq("email", email).maybeSingle()).data
          : null);

      if (!staffRow?.clinic_id) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      const { data: clinic } = await supabase
        .from("clinics")
        .select("type")
        .eq("id", staffRow.clinic_id)
        .maybeSingle();

      const isMultiSpecialist = clinic?.type === "multi_specialist";
      const isAllowed = isMultiSpecialist ? staffRow.role === "admin" : staffRow.role === "doctor" || staffRow.role === "admin";
      setAllowed(isAllowed);

      if (!isAllowed) {
        setLoading(false);
        return;
      }

      const { data: info, error } = await supabase
        .from("clinic_payment_info")
        .select(
          "id, payment_method, bank_name, account_number, account_holder_name, mobile_money_provider, mobile_money_number, status, submitted_at, rejection_reason"
        )
        .eq("clinic_id", staffRow.clinic_id)
        .maybeSingle();

      if (error) console.error("[ClinicPaymentInfoCard] erreur chargement :", error.message);

      if (info) {
        setCurrent(info as PaymentInfo);
        setMethod(info.payment_method);
        setBankName(info.bank_name ?? "");
        setAccountNumber(info.account_number ?? "");
        setAccountHolder(info.account_holder_name ?? "");
        setMomoProvider(info.mobile_money_provider ?? "");
        setMomoNumber(info.mobile_money_number ?? "");
      }

      setLoading(false);
    };

    load();
  }, [user]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`${FUNCTIONS_BASE}/clinic-submit-payment-info`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          payment_method: method,
          bank_name: bankName,
          account_number: accountNumber,
          account_holder_name: accountHolder,
          mobile_money_provider: momoProvider,
          mobile_money_number: momoNumber,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Erreur lors de l'enregistrement.");

      toast.success("Coordonnées enregistrées, en attente de vérification par Mediconnect+.");
      setCurrent((prev) => ({
        id: prev?.id ?? "",
        payment_method: method,
        bank_name: bankName || null,
        account_number: accountNumber || null,
        account_holder_name: accountHolder || null,
        mobile_money_provider: momoProvider || null,
        mobile_money_number: momoNumber || null,
        status: "pending",
        submitted_at: new Date().toISOString(),
        rejection_reason: null,
      }));
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || allowed === null) return null;
  if (!allowed) return null;

  const badge = current ? statusBadge(current.status) : null;

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Coordonnées de paiement</h2>
        <p className="text-sm text-gray-500">
          Utilisées pour vous reverser les remboursements des assureurs. Toute modification repasse
          en vérification avant de devenir active — vérifiée manuellement par l'équipe Mediconnect+.
        </p>
      </div>

      {badge && (
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded font-medium ${badge.tone}`}>{badge.text}</span>
          {current?.submitted_at && (
            <span className="text-xs text-gray-400">
              Soumis le {new Date(current.submitted_at).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>
      )}

      {current?.status === "rejected" && current.rejection_reason && (
        <p className="text-sm text-red-700 bg-red-50 rounded p-2">Motif du rejet : {current.rejection_reason}</p>
      )}

      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={method === "bank_transfer"}
            onChange={() => setMethod("bank_transfer")}
          />
          Virement bancaire
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={method === "mobile_money"}
            onChange={() => setMethod("mobile_money")}
          />
          Mobile money
        </label>
      </div>

      {method === "bank_transfer" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Banque</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Numéro de compte / RIB</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-700">Titulaire du compte</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="Doit correspondre au cabinet"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Opérateur</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={momoProvider}
              onChange={(e) => setMomoProvider(e.target.value)}
              placeholder="Airtel Money, Moov Money..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Numéro</label>
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              value={momoNumber}
              onChange={(e) => setMomoNumber(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? "Enregistrement..." : current ? "Mettre à jour" : "Soumettre pour vérification"}
        </Button>
      </div>
    </Card>
  );
}
