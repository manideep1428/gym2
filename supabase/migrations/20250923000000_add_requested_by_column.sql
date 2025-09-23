-- Add requested_by column to client_trainer_relationships table
-- Only clients can initiate relationship requests

ALTER TABLE client_trainer_relationships 
ADD COLUMN IF NOT EXISTS requested_by text DEFAULT 'client' CHECK (requested_by = 'client');

-- Update the RLS policy to only allow clients to create relationship requests
DROP POLICY IF EXISTS "Clients can create relationship requests" ON client_trainer_relationships;
DROP POLICY IF EXISTS "Clients and trainers can create relationship requests" ON client_trainer_relationships;

CREATE POLICY "Only clients can create relationship requests" ON client_trainer_relationships
  FOR INSERT WITH CHECK (
    auth.uid() = client_id AND 
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'client')
  );

-- Add comment for documentation
COMMENT ON COLUMN client_trainer_relationships.requested_by IS 'Always client - only clients can initiate relationship requests';
