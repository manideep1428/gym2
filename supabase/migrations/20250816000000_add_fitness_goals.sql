-- Add fitness_goals column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fitness_goals text;

-- Add comment for documentation
COMMENT ON COLUMN profiles.fitness_goals IS 'Client fitness goals and objectives';