-- Add client-trainer relationship system
-- This allows clients to request to become a trainer's dedicated client

-- Client-Trainer relationships table
CREATE TABLE IF NOT EXISTS client_trainer_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'terminated')),
  requested_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  terminated_at timestamptz,
  client_message text,
  trainer_response text,
  requested_by text DEFAULT 'client' CHECK (requested_by = 'client'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure unique relationship between client and trainer
  UNIQUE(client_id, trainer_id)
);

-- Enable RLS
ALTER TABLE client_trainer_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_trainer_relationships
CREATE POLICY "View own relationships" ON client_trainer_relationships
  FOR SELECT USING (
    auth.uid() = client_id OR 
    auth.uid() = trainer_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "Only clients can create relationship requests" ON client_trainer_relationships
  FOR INSERT WITH CHECK (
    auth.uid() = client_id AND 
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'client')
  );

CREATE POLICY "Trainers and clients can update relationships" ON client_trainer_relationships
  FOR UPDATE USING (
    auth.uid() = client_id OR 
    auth.uid() = trainer_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_trainer_relationships_client_id ON client_trainer_relationships(client_id);
CREATE INDEX IF NOT EXISTS idx_client_trainer_relationships_trainer_id ON client_trainer_relationships(trainer_id);
CREATE INDEX IF NOT EXISTS idx_client_trainer_relationships_status ON client_trainer_relationships(status);

-- Update payment_requests table to include relationship context
ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS relationship_id uuid REFERENCES client_trainer_relationships(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON TABLE client_trainer_relationships IS 'Manages dedicated client-trainer relationships where clients can request to become a trainers exclusive client';
COMMENT ON COLUMN payment_requests.relationship_id IS 'Links payment request to a specific client-trainer relationship for dedicated clients';

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_client_trainer_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_client_trainer_relationships_updated_at
  BEFORE UPDATE ON client_trainer_relationships
  FOR EACH ROW EXECUTE FUNCTION update_client_trainer_relationships_updated_at();
