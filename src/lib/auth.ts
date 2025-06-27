import { supabase } from './supabase';

export interface EstablishmentUser {
  id: string;
  name: string;
  role: string;
  email: string;
  clinicId: string;
  clinicName: string;
}

// console.log("[DEBUG] user identifié :", user); // Removed undefined variable 'user'

// Liste des développeurs autorisés
const authorizedDevelopers = ['nkopierre3@gmail.com'];

export async function loginEstablishment(
  establishmentName: string,
  role: string,
  password: string
): Promise<EstablishmentUser | null> {
  try {
    // Vérifier si c'est un développeur autorisé
    const userEmail = localStorage.getItem('userEmail');
    const isDeveloper = authorizedDevelopers.includes(userEmail || '');

    // Pour les développeurs, on crée un utilisateur de test
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

    // Pour les assureurs, vérifier dans la table etablissements
    if (role === 'assurer') {
      const { data: etablissement } = await supabase
        .from('etablissements')
        .select('*')
        .eq('nom', establishmentName)
        .eq('type', 'assureur')
        .single();

      if (!etablissement) {
        throw new Error("Établissement non trouvé");
      }

      // Vérifier le mot de passe (dans un cas réel, utiliser un hash)
      if (password !== 'Test2025') {
        throw new Error("Mot de passe incorrect");
      }

      return {
        id: etablissement.id,
        name: etablissement.nom,
        role: 'assurer',
        email: etablissement.email || '',
        clinicId: etablissement.id,
        clinicName: etablissement.nom
      };
    }

    // Pour les autres utilisateurs, continuer avec la logique normale
    const { data: clinic } = await supabase
      .from('clinics')
      .select('*')
      .ilike('name', establishmentName)
      .single();

    if (!clinic) {
      throw new Error("Établissement non trouvé");
    }

    const { data: staff } = await supabase
      .from('clinic_staff')
      .select(`
        *,
        clinics (
          name
        )
      `)
      .eq('clinic_id', clinic.id)
      .eq('role', role)
      .single();

    if (!staff) {
      throw new Error("Utilisateur non trouvé pour ce rôle");
    }

    return {
      id: staff.id,
      name: staff.name,
      role: staff.role,
      email: staff.email,
      clinicId: clinic.id,
      clinicName: clinic.name
    };
  } catch (error) {
    console.error('Erreur de connexion:', error);
    return null;
  }
}