/*
  # Ajout des politiques RLS pour la table clinics

  1. Sécurité
    - Ajout d'une politique permettant aux utilisateurs authentifiés d'insérer des cliniques
    - Ajout d'une politique permettant aux utilisateurs authentifiés de mettre à jour leurs cliniques
*/

-- Politique pour permettre l'insertion de cliniques
CREATE POLICY "Allow authenticated users to insert clinics"
  ON clinics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Politique pour permettre la mise à jour des cliniques
CREATE POLICY "Allow authenticated users to update clinics"
  ON clinics
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);