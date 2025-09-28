-- Allow trainers to initiate client relationships and create custom packages
-- This migration updates the client_trainer_relationships table and creates custom packages

-- Update client_trainer_relationships to ONLY support trainer-initiated requests
ALTER TABLE client_trainer_relationships 
DROP CONSTRAINT IF EXISTS client_trainer_relationships_requested_by_check;

-- First, update all existing 'client' requests to 'trainer' to maintain data integrity
UPDATE client_trainer_relationships 
SET requested_by = 'trainer' 
WHERE requested_by = 'client';

-- Update requested_by to only allow 'trainer'
ALTER TABLE client_trainer_relationships 
ALTER COLUMN requested_by DROP DEFAULT;

ALTER TABLE client_trainer_relationships 
ADD CONSTRAINT client_trainer_relationships_requested_by_check 
CHECK (requested_by = 'trainer');

-- Set default to 'trainer' since only trainers can initiate
ALTER TABLE client_trainer_relationships 
ALTER COLUMN requested_by SET DEFAULT 'trainer';

-- Update RLS policies to ONLY allow trainers to create relationships
DROP POLICY IF EXISTS "Only clients can create relationship requests" ON client_trainer_relationships;
DROP POLICY IF EXISTS "Clients and trainers can create relationship requests" ON client_trainer_relationships;
DROP POLICY IF EXISTS "Only trainers can create relationship requests" ON client_trainer_relationships;

CREATE POLICY "Only trainers can create relationship requests" ON client_trainer_relationships
  FOR INSERT WITH CHECK (
    auth.uid() = trainer_id AND 
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'trainer') AND 
    requested_by = 'trainer'
  );

-- Create custom_packages table for trainer-created packages
CREATE TABLE IF NOT EXISTS custom_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship_id uuid REFERENCES client_trainer_relationships(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  sessions_included integer NOT NULL DEFAULT 1,
  validity_days integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  features text[] DEFAULT '{}',
  terms_conditions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz
);

-- Enable RLS for custom_packages
ALTER TABLE custom_packages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "View own packages" ON custom_packages;
DROP POLICY IF EXISTS "Trainers can create packages" ON custom_packages;
DROP POLICY IF EXISTS "Trainers can update their packages" ON custom_packages;
DROP POLICY IF EXISTS "Clients can update package status" ON custom_packages;

-- RLS Policies for custom_packages
CREATE POLICY "View own packages" ON custom_packages
  FOR SELECT USING (
    auth.uid() = trainer_id OR 
    auth.uid() = client_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "Trainers can create packages" ON custom_packages
  FOR INSERT WITH CHECK (
    auth.uid() = trainer_id AND 
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'trainer')
  );

CREATE POLICY "Trainers can update their packages" ON custom_packages
  FOR UPDATE USING (
    auth.uid() = trainer_id AND 
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'trainer')
  );

CREATE POLICY "Clients can update package status" ON custom_packages
  FOR UPDATE USING (
    auth.uid() = client_id AND 
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'client')
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_custom_packages_trainer_id ON custom_packages(trainer_id);
CREATE INDEX IF NOT EXISTS idx_custom_packages_client_id ON custom_packages(client_id);
CREATE INDEX IF NOT EXISTS idx_custom_packages_relationship_id ON custom_packages(relationship_id);
CREATE INDEX IF NOT EXISTS idx_custom_packages_status ON custom_packages(status);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_custom_packages_updated_at ON custom_packages;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_custom_packages_updated_at
  BEFORE UPDATE ON custom_packages
  FOR EACH ROW EXECUTE FUNCTION update_custom_packages_updated_at();

-- Function to automatically set expires_at based on validity_days
CREATE OR REPLACE FUNCTION set_package_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at = NEW.created_at + (NEW.validity_days || ' days')::interval;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_package_expiry ON custom_packages;

-- Trigger to set package expiry
CREATE TRIGGER set_package_expiry
  BEFORE INSERT ON custom_packages
  FOR EACH ROW EXECUTE FUNCTION set_package_expiry();

-- Add comments for documentation
COMMENT ON TABLE custom_packages IS 'Custom training packages created by trainers for specific clients';
COMMENT ON COLUMN custom_packages.trainer_id IS 'Trainer who created the package';
COMMENT ON COLUMN custom_packages.client_id IS 'Client for whom the package is created';
COMMENT ON COLUMN custom_packages.relationship_id IS 'Associated client-trainer relationship';
COMMENT ON COLUMN custom_packages.sessions_included IS 'Number of training sessions included';
COMMENT ON COLUMN custom_packages.validity_days IS 'Package validity in days from creation';
COMMENT ON COLUMN custom_packages.features IS 'Array of package features/benefits';
COMMENT ON COLUMN custom_packages.status IS 'Package status: pending, accepted, rejected, expired';
