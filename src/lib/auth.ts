import { supabase } from './supabase';

// Liste des emails développeurs autorisés
const authorizedDevelopers: string[] = [
  'nkopierre3@gmail.com',
  'dev2@example.com'
];

export type EstablishmentUser = {
  id: string;
  name: string;
  role: string;
  email: string;
  clinicId: string;
  clinicName: string;
};

export async function loginEstablishment(
  establishmentName: string,
  role: string,
  password: string
): Promise<EstablishmentUser | null> {
  try {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
      throw new Error("Email utilisateur introuvable");
    }

    const isDeveloper = authorizedDevelopers.includes(userEmail || '');

    if (isDeveloper) {
      return {
        id: 'DEV-TEST-ID',
        name: 'Développeur Test',
        role: role,
        email: userEmail || '',
        clinicId: 'TEST-CLINIC-ID',
        clinicName: 'Clinique Test',
      };
    }

    if (role === 'assurer') {
      const { data: etablissement } = await supabase
        .from('etablissements')
        .select('*')
        .eq('email', userEmail)
        .eq('type', 'assureur')
        .single();

      if (!etablissement) throw new Error("Établissement non trouvé");
      if (password !== 'Test2025') throw new Error("Mot de passe incorrect");

      return {
        id: etablissement.id,
        name: etablissement.nom,
        role: 'assurer',
        email: etablissement.email || '',
        clinicId: etablissement.id,
        clinicName: etablissement.nom
      };
    }

    // ✅ NOUVELLE LOGIQUE POUR LES CABINETS / CLINIQUES
    const { data: staff, error: staffError } = await supabase
      .from('clinic_staff')
      .select(`
        *,
        clinics (
          id,
          name
        )
      `)
      .eq('email', userEmail)
      .eq('role', role)
      .maybeSingle();

    if (staffError || !staff) {
      throw new Error("Utilisateur non trouvé pour ce rôle");
    }

    return {
      id: staff.id,
      name: staff.name,
      role: staff.role,
      email: staff.email,
      clinicId: staff.clinic_id,
      clinicName: staff.clinics.name
    };
  } catch (error) {
    console.error('Erreur de connexion:', error);
    return null;
  }
}
