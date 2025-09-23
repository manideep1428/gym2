-- Fix notification settings defaults to enable push notifications by default
-- First ensure the notification_settings table exists

-- Add push_token column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Create notification_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  push_notifications BOOLEAN DEFAULT true, -- Changed default to true
  booking_requests BOOLEAN DEFAULT true,
  booking_confirmations BOOLEAN DEFAULT true,
  session_reminders BOOLEAN DEFAULT true,
  cancellations BOOLEAN DEFAULT true,
  reminder_time INTEGER DEFAULT 10, -- minutes before session
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS if not already enabled
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$ 
BEGIN
  -- Users can view their own notification settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_settings' 
    AND policyname = 'Users can view own notification settings'
  ) THEN
    CREATE POLICY "Users can view own notification settings" ON notification_settings
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- Users can insert their own notification settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_settings' 
    AND policyname = 'Users can insert own notification settings'
  ) THEN
    CREATE POLICY "Users can insert own notification settings" ON notification_settings
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Users can update their own notification settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notification_settings' 
    AND policyname = 'Users can update own notification settings'
  ) THEN
    CREATE POLICY "Users can update own notification settings" ON notification_settings
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Update existing notification_settings to enable push notifications
UPDATE notification_settings 
SET push_notifications = true 
WHERE push_notifications = false;

-- Update the default value for new users (if table already existed)
ALTER TABLE notification_settings 
ALTER COLUMN push_notifications SET DEFAULT true;

-- Create notification settings for existing users who don't have them
INSERT INTO notification_settings (user_id, push_notifications, booking_requests, booking_confirmations, session_reminders, cancellations)
SELECT 
  p.id,
  true,
  true, 
  true,
  true,
  true
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM notification_settings ns WHERE ns.user_id = p.id
)
ON CONFLICT (user_id) DO UPDATE SET
  push_notifications = true,
  booking_requests = COALESCE(notification_settings.booking_requests, true),
  booking_confirmations = COALESCE(notification_settings.booking_confirmations, true),
  session_reminders = COALESCE(notification_settings.session_reminders, true),
  cancellations = COALESCE(notification_settings.cancellations, true);

-- Create function to automatically create notification settings for new users
CREATE OR REPLACE FUNCTION create_notification_settings_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_settings (user_id, push_notifications)
  VALUES (NEW.id, true); -- Default to true for new users
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create notification settings
DROP TRIGGER IF EXISTS create_notification_settings_trigger ON profiles;
CREATE TRIGGER create_notification_settings_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_settings_for_user();

-- Add notification_id column to bookings table for tracking scheduled notifications
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notification_id TEXT;
