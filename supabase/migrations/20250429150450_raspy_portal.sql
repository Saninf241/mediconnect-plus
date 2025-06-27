-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for notifications
CREATE POLICY "Users can read their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create function to trigger Edge Function
CREATE OR REPLACE FUNCTION handle_new_claim()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'sent' THEN
    -- Trigger Edge Function
    PERFORM
      net.http_post(
        url := current_setting('app.settings.edge_function_url') || '/claims-notification',
        body := json_build_object(
          'id', NEW.id,
          'patient', json_build_object(
            'name', (SELECT name FROM patients WHERE id = NEW.patient_id)
          ),
          'amount', NEW.amount,
          'procedure', NEW.type,
          'sent_at', NEW.created_at,
          'status', NEW.status,
          'assurer_id', (SELECT id FROM clinic_staff WHERE role = 'assurer' AND clinic_id = NEW.clinic_id LIMIT 1),
          'assurer_email', (SELECT email FROM clinic_staff WHERE role = 'assurer' AND clinic_id = NEW.clinic_id LIMIT 1)
        )::jsonb
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS claims_notification_trigger ON consultations;
CREATE TRIGGER claims_notification_trigger
  AFTER INSERT OR UPDATE ON consultations
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_claim();