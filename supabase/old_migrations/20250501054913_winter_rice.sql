/*
  # Add email field to etablissements table

  1. Schema Changes
    - Add email column to etablissements table
    - Add email validation constraint
    - Update ACME Assurances record with email
*/

-- Add email column
ALTER TABLE etablissements 
ADD COLUMN email text;

-- Add email validation constraint
ALTER TABLE etablissements 
ADD CONSTRAINT valid_email 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Update ACME Assurances with email
UPDATE etablissements 
SET email = 'acme@mediconnect.com'
WHERE nom = 'ACME Assurances' AND type = 'assureur';