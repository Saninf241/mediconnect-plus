import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface Props {
  open: boolean;
  onClose: () => void;
  onPatientCreated: () => void;
}

export default function AddPatientModal({ open, onClose, onPatientCreated }: Props) {
  const [form, setForm] = useState({
    name: '',
    date_of_birth: '',
    email: '',
    phone: '',
    is_assured: false,
    fingerprint_missing: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('patients').insert([{ ...form }]);
      if (insertError) throw insertError;
      onPatientCreated();
      onClose();
    } catch (err) {
      setError('Erreur lors de la création du patient');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un nouveau patient</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input name="name" value={form.name} onChange={handleChange} placeholder="Nom complet" />
          <Input name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} />
          <Input name="email" value={form.email} onChange={handleChange} placeholder="Email (optionnel)" />
          <Input name="phone" value={form.phone} onChange={handleChange} placeholder="Téléphone (optionnel)" />

          <div className="flex items-center space-x-2">
            <label>
              <input type="checkbox" name="is_assured" checked={form.is_assured} onChange={handleChange} /> Assuré
            </label>
            <label>
              <input type="checkbox" name="fingerprint_missing" checked={form.fingerprint_missing} onChange={handleChange} /> Empreinte manquante
            </label>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button disabled={loading} onClick={handleSubmit} className="w-full">
            {loading ? 'Ajout...' : 'Créer le patient'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
