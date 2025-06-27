/*
  # Add alerts table for consultation notifications

  1. New Table
    - `alerts`
      - `id` (uuid, primary key)
      - `type` (text)
      - `message` (text)
      - `consultation_id` (uuid, references consultations)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
    - Add indexes for performance
*/

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
  message text NOT NULL,
  consultation_id uuid REFERENCES consultations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Anyone can read alerts"
  ON alerts
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create alerts"
  ON alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add indexes for better performance
CREATE INDEX idx_alerts_consultation ON alerts(consultation_id);
CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);

-- Add trigger to notify relevant users when alert is created
CREATE OR REPLACE FUNCTION notify_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into notifications table
  INSERT INTO notifications (
    user_id,
    type,
    title,
    content,
    metadata
  )
  SELECT
    cs.id,
    NEW.type,
    CASE NEW.type
      WHEN 'warning' THEN 'Avertissement'
      WHEN 'error' THEN 'Erreur'
      WHEN 'success' THEN 'Succès'
      ELSE 'Information'
    END,
    NEW.message,
    jsonb_build_object(
      'consultation_id', NEW.consultation_id,
      'alert_id', NEW.id
    )
  FROM consultations c
  JOIN clinic_staff cs ON c.doctor_id = cs.id
  WHERE c.id = NEW.consultation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alert_notification
  AFTER INSERT ON alerts
  FOR EACH ROW
  EXECUTE FUNCTION notify_alert();