import { useEffect, useState } from 'react';
import { getMessages, sendMessage, Message } from '../../../lib/queries/messages';
import { supabase } from '../../../lib/supabase';

interface Props {
  consultationId: string;
  doctorId: string;
}

export default function ConsultationChatAssureur({ consultationId, doctorId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [canChat, setCanChat] = useState<boolean>(true);

  useEffect(() => {
    const fetchMessages = async () => {
      const data = await getMessages(consultationId);
      setMessages(data);
    };

    const checkDoctorSubscription = async () => {
      const { data: staff } = await supabase
        .from('clinic_staff')
        .select('clinic_id')
        .eq('id', doctorId)
        .maybeSingle();

      if (staff?.clinic_id) {
        const { data: clinic } = await supabase
          .from('clinics')
          .select('subscription_plan')
          .eq('id', staff.clinic_id)
          .maybeSingle();

        if (!clinic || clinic.subscription_plan !== 'premium') {
          setCanChat(false);
        }
      } else {
        setCanChat(false);
      }
    };

    fetchMessages();
    checkDoctorSubscription();
  }, [consultationId, doctorId]);

  const handleSend = async () => {
    setLoading(true);
    const senderId = (await supabase.auth.getUser()).data.user?.id;
    if (!senderId || !newMessage.trim()) return;

    await sendMessage(consultationId, senderId, doctorId, 'assurer', newMessage.trim());
    setNewMessage('');
    await fetchMessages();
    setLoading(false);
  };

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-white">
      <h2 className="font-semibold text-lg">Discussion avec le médecin</h2>

      <div className="h-64 overflow-y-auto border p-2 bg-gray-50 rounded">
        {messages.map((m) => (
          <div key={m.id} className={`mb-2 ${m.sender_role === 'assurer' ? 'text-right' : 'text-left'}`}>
            <div
              className={`inline-block px-4 py-2 rounded-lg text-sm ${
                m.sender_role === 'assurer' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-900'
              }`}
            >
              {m.message}
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-center text-gray-400">Aucun message pour cette consultation.</p>
        )}
      </div>

      {!canChat ? (
        <div className="text-sm text-red-600 italic">
          Cette messagerie est réservée aux cabinets abonnés au plan Premium.
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 border p-2 rounded"
            placeholder="Votre message..."
          />
          <button
            onClick={handleSend}
            disabled={loading || !newMessage.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            Envoyer
          </button>
        </div>
      )}
    </div>
  );
}
