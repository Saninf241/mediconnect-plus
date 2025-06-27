/*
  # Add payments table for tracking insurance payments

  1. New Table
    - `payments`
      - `id` (uuid, primary key)
      - `consultation_id` (uuid, references consultations)
      - `assurer_id` (uuid, references clinic_staff)
      - `clinic_id` (uuid, references clinics)
      - `amount` (numeric)
      - `commission` (numeric)
      - `total_amount` (numeric)
      - `status` (text)
      - `payment_date` (timestamptz)
      - `payment_method` (text)
      - `payment_reference` (text)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for assurers
*/

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid REFERENCES consultations(id),
  assurer_id uuid REFERENCES clinic_staff(id),
  clinic_id uuid REFERENCES clinics(id),
  amount numeric NOT NULL,
  commission numeric NOT NULL,
  total_amount numeric NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  payment_date timestamptz,
  payment_method text NOT NULL,
  payment_reference text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT positive_amounts CHECK (
    amount >= 0 AND
    commission >= 0 AND
    total_amount >= 0
  )
);

-- Add payment status to consultations
ALTER TABLE consultations 
ADD COLUMN IF NOT EXISTS payment_status text CHECK (payment_status IN ('pending', 'paid', 'failed')),
ADD COLUMN IF NOT EXISTS payment_date timestamptz;

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Assurers can view payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clinic_staff
      WHERE id = auth.uid()
      AND role = 'assurer'
    )
  );

CREATE POLICY "Assurers can create payments"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clinic_staff
      WHERE id = auth.uid()
      AND role = 'assurer'
    )
  );

-- Add indexes
CREATE INDEX idx_payments_consultation ON payments(consultation_id);
CREATE INDEX idx_payments_assurer ON payments(assurer_id);
CREATE INDEX idx_payments_clinic ON payments(clinic_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_consultations_payment_status ON consultations(payment_status);