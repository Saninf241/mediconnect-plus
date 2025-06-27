/*
  # Add notifications table and update detect-anomalies function

  1. New Table
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid)
      - `type` (text)
      - `title` (text)
      - `content` (text)
      - `metadata` (jsonb)
      - `read` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policy for users to view their own notifications
*/

-- Create notifications table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'notifications'
  ) THEN
    CREATE TABLE notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      type text NOT NULL,
      title text NOT NULL,
      content text NOT NULL,
      metadata jsonb DEFAULT '{}',
      read boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

    -- Add RLS policies
    CREATE POLICY "Users can read their own notifications"
      ON notifications
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;