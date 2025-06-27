import { useEffect, useState } from 'react';
import { getMessages, sendMessage, Message } from '../../../lib/queries/messages';
import { supabase } from '../../../lib/supabase';

interface ConsultationChatProps {
  consultationId: string;
  senderId: string;
  senderRole: 'doctor' | 'assureur';
}

export default function ConsultationChat({
  consultationId,
  senderId,
  senderRole,
}: ConsultationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<'basic' | 'premium' | null>(null);

  const fetchMessages = async () => {
    const data = await getMessages(consultationId);
    setMessages(data);
  };

  useEffect(() => {
    fetchMessages();
  }, [consultationId]);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (senderRole !== 'doctor') return;

      const { data: staff } = await supabase
        .from('clinic_staff')
        .select('clinic_id')
        .eq('id', senderId)
        .maybeSingle();

      if (staff?.clinic_id) {
        const { data: clinic } = await supabase
          .from('clinics')
          .select('subscription_plan')
          .eq('id', staff.clinic_id)
          .maybeSingle();

        if (clinic?.subscription_plan) {
          setSubscriptionPlan(clinic.subscription_plan);
        }
      }
    };

    fetchSubscription();
  }, [senderId, senderRole]);

  const isDoctorBlocked = senderRole === 'doctor' && subscriptionPlan !== 'premium';

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setLoading(true);

    await sendMessage(consultationId, senderId, senderRole, newMessage.trim());
    setNewMessage('');
    await fetchMessages();

    setLoading(false);
  };

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-white">
      <h2 className="font-semibold text-lg">Discussion liée à cette consultation</h2>

      {isDoctorBlocked && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-3 rounded">
          Fonction de messagerie réservée aux abonnements <strong>premium</strong>.
        </div>
      )}

      <div className={`h-64 overflow-y-auto border p-2 bg-gray-50 rounded ${isDoctorBlocked ? 'opacity-50' : ''}`}>
        {messages.length > 0 ? (
          messages.map((m) => (
            <div key={m.id} className={`mb-2 ${m.sender_role === senderRole ? 'text-right' : 'text-left'}`}>
              <div
                className={`inline-block px-4 py-2 rounded-lg text-sm ${
                  m.sender_role === senderRole
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                {m.message}
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-400">Aucun message pour cette consultation.</p>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 border p-2 rounded"
          placeholder={isDoctorBlocked ? 'Fonction réservée au plan premium' : 'Votre message...'}
          disabled={isDoctorBlocked}
        />
        <button
          onClick={handleSend}
          disabled={loading || !newMessage.trim() || isDoctorBlocked}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Envoyer
        </button>
      </div>
    </div>
  );
}
