-- Add Google Calendar integration tables and columns

-- Add Google Calendar auth info to profiles
ALTER TABLE profiles ADD COLUMN google_calendar_access_token text;
ALTER TABLE profiles ADD COLUMN google_calendar_refresh_token text;
ALTER TABLE profiles ADD COLUMN google_calendar_token_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN google_calendar_connected boolean DEFAULT false;

-- Add calendar event ID to bookings
ALTER TABLE bookings ADD COLUMN google_calendar_event_id text;
ALTER TABLE bookings ADD COLUMN calendar_added_by_client boolean DEFAULT false;
ALTER TABLE bookings ADD COLUMN calendar_added_by_trainer boolean DEFAULT false;

-- Create table for storing Google Calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  google_event_id text NOT NULL,
  calendar_id text DEFAULT 'primary',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for calendar_events
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Calendar events policies
CREATE POLICY "Users can view own calendar events" ON calendar_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own calendar events" ON calendar_events
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_booking_id ON calendar_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_google_calendar_event_id ON bookings(google_calendar_event_id);
