/*
  # Add payment batches system

  1. New Tables
    - `payment_batches`
      - `id` (uuid, primary key)
      - `clinic_id` (uuid, references clinics)
      - `amount` (bigint)
      - `commission` (bigint)
      - `total_paid` (bigint)
      - `status` (text)
      - `paid_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `batch_items`
      - `id` (uuid, primary key)
      - `batch_id` (uuid, references payment_batches)
      - `consultation_id` (uuid, references consultations)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add appropriate indexes
*/

-- Create payment_batches table
CREATE TABLE IF NOT EXISTS payment_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id),
  amount bigint,
  commission bigint,
  total_paid bigint,
  status text DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create batch_items table
CREATE TABLE IF NOT EXISTS batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES payment_batches(id) ON DELETE CASCADE,
  consultation_id uuid REFERENCES consultations(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_items ENABLE ROW LEVEL SECURITY;