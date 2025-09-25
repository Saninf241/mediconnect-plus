/*
  # Schema Enhancements

  1. New Fields and Improvements
    - Add versioning and audit fields
    - Add status tracking
    - Enhance relationships and constraints
    - Add useful indexes
    - Add validation checks

  2. Security
    - Add RLS policies for better access control
    - Add row-level audit tracking
*/

-- Add versioning to patients table
ALTER TABLE patients 
ADD COLUMN version integer DEFAULT 1,
ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
ADD COLUMN last_visit_date timestamptz,
ADD COLUMN medical_history jsonb,
ADD COLUMN emergency_contact jsonb;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_insurance ON patients(insurance_number) WHERE insurance_number IS NOT NULL;

-- Add constraints for phone and email validation
ALTER TABLE patients 
ADD CONSTRAINT valid_phone CHECK (phone ~ '^[+]?[0-9\s-()]{8,}$'),
ADD CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Enhance clinic_staff table
ALTER TABLE clinic_staff 
ADD COLUMN status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
ADD COLUMN schedule jsonb,
ADD COLUMN qualifications jsonb[],
ADD COLUMN version integer DEFAULT 1,
ADD COLUMN last_login timestamptz;

-- Add indexes for clinic_staff
CREATE INDEX IF NOT EXISTS idx_clinic_staff_name ON clinic_staff(name);
CREATE INDEX IF NOT EXISTS idx_clinic_staff_role_status ON clinic_staff(role, status);
CREATE INDEX IF NOT EXISTS idx_clinic_staff_email ON clinic_staff(email);

-- Enhance consultations table
ALTER TABLE consultations 
ADD COLUMN version integer DEFAULT 1,
ADD COLUMN consultation_type text CHECK (consultation_type IN ('routine', 'emergency', 'follow_up', 'specialist')),
ADD COLUMN duration interval,
ADD COLUMN next_visit_date date,
ADD COLUMN attachments jsonb,
ADD COLUMN medical_history_snapshot jsonb,
ADD COLUMN prescription jsonb,
ADD COLUMN vital_signs jsonb;

-- Add indexes for consultations
CREATE INDEX IF NOT EXISTS idx_consultations_date ON consultations(created_at);
CREATE INDEX IF NOT EXISTS idx_consultations_type ON consultations(consultation_type);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);

-- Add consultation history tracking
CREATE TABLE IF NOT EXISTS consultation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid REFERENCES consultations(id),
  changed_by uuid REFERENCES clinic_staff(id),
  changed_at timestamptz DEFAULT now(),
  changes jsonb NOT NULL,
  version integer NOT NULL
);

-- Enable RLS on consultation_history
ALTER TABLE consultation_history ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for consultation_history
CREATE POLICY "Staff can view consultation history"
  ON consultation_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can insert consultation history"
  ON consultation_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add trigger to track consultation changes
CREATE OR REPLACE FUNCTION track_consultation_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    INSERT INTO consultation_history (
      consultation_id,
      changed_by,
      changes,
      version
    ) VALUES (
      NEW.id,
      auth.uid(),
      jsonb_build_object(
        'previous', row_to_json(OLD),
        'new', row_to_json(NEW)
      ),
      NEW.version
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consultation_history_trigger
  AFTER UPDATE ON consultations
  FOR EACH ROW
  EXECUTE FUNCTION track_consultation_changes();

-- Add medical_codes table for standardized coding
CREATE TABLE IF NOT EXISTS medical_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_type text NOT NULL CHECK (code_type IN ('ICD-10', 'CCAM', 'NGAP')),
  code text NOT NULL,
  description text NOT NULL,
  category text,
  subcategory text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (code_type, code)
);

-- Enable RLS on medical_codes
ALTER TABLE medical_codes ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for medical_codes
CREATE POLICY "Anyone can view medical codes"
  ON medical_codes FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage medical codes"
  ON medical_codes
  USING (true);

-- Add consultation_codes junction table
CREATE TABLE IF NOT EXISTS consultation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid REFERENCES consultations(id),
  medical_code_id uuid REFERENCES medical_codes(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (consultation_id, medical_code_id)
);

-- Enable RLS on consultation_codes
ALTER TABLE consultation_codes ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for consultation_codes
CREATE POLICY "Staff can view consultation codes"
  ON consultation_codes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Staff can manage consultation codes"
  ON consultation_codes
  USING (true);

-- Add indexes for medical coding
CREATE INDEX IF NOT EXISTS idx_medical_codes_type_code ON medical_codes(code_type, code);
CREATE INDEX IF NOT EXISTS idx_consultation_codes_consultation ON consultation_codes(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_codes_code ON consultation_codes(medical_code_id);

-- Add trigger to update version on changes
CREATE OR REPLACE FUNCTION update_version_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add version update triggers
CREATE TRIGGER update_patient_version
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION update_version_column();

CREATE TRIGGER update_clinic_staff_version
  BEFORE UPDATE ON clinic_staff
  FOR EACH ROW
  EXECUTE FUNCTION update_version_column();

CREATE TRIGGER update_consultation_version
  BEFORE UPDATE ON consultations
  FOR EACH ROW
  EXECUTE FUNCTION update_version_column();