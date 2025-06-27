/*
  # Create Reports Generation System

  1. New Table
    - `generated_reports`
      - `id` (uuid, primary key)
      - `type` (text) - weekly or monthly
      - `generated_at` (timestamptz)
      - `url` (text) - storage URL for the PDF
      - `assurer_id` (uuid) - link to the assurer
      - `data` (jsonb) - report metrics and data

  2. Security
    - Enable RLS
    - Add policy for assurers to view their reports
*/

-- Create generated_reports table
CREATE TABLE IF NOT EXISTS generated_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('weekly', 'monthly')),
  generated_at timestamptz DEFAULT now(),
  url text,
  assurer_id uuid,
  data jsonb
);

-- Enable RLS
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Assurers can view their own reports"
  ON generated_reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = assurer_id);

-- Create function to auto-generate reports
CREATE OR REPLACE FUNCTION generate_weekly_report()
RETURNS void AS $$
BEGIN
  -- This would be implemented in a real system
  -- For now, it's a placeholder
  NULL;
END;
$$ LANGUAGE plpgsql;