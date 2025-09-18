-- Add session durations to trainer availability
-- This allows trainers to specify what session lengths they offer for each availability block

ALTER TABLE trainer_availability
ADD COLUMN session_durations integer[] DEFAULT '{30,60}';

-- Add a comment to document the field
COMMENT ON COLUMN trainer_availability.session_durations IS 'Array of session durations in minutes that can be booked for this availability slot. Defaults to 30 and 60 minutes.';

-- Update existing records to have default durations
UPDATE trainer_availability
SET session_durations = '{30,60}'
WHERE session_durations IS NULL;
