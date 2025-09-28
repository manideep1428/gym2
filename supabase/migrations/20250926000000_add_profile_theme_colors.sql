/*
  # Add Profile Theme Colors Support
  
  This migration adds theme color customization support to user profiles.
  Users can choose from predefined color themes or set custom colors.
*/

-- Add profile_color column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profile_color text DEFAULT '#22C1C3';

-- Add theme_preference column to store light/dark preference per user
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS theme_preference text DEFAULT 'system' 
CHECK (theme_preference IN ('light', 'dark', 'system'));

-- Add custom_theme_colors column to store user's custom color overrides
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS custom_theme_colors jsonb DEFAULT '{}';

-- Create predefined color themes table
CREATE TABLE IF NOT EXISTS theme_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  primary_color text NOT NULL,
  secondary_color text,
  accent_color text,
  description text,
  is_premium boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Insert predefined color themes
INSERT INTO theme_colors (name, display_name, primary_color, secondary_color, accent_color, description, is_premium) VALUES
-- Free themes
('teal', 'Teal Ocean', '#22C1C3', '#8B5CF6', '#06B6D4', 'Cool and refreshing teal theme', false),
('blue', 'Ocean Blue', '#3B82F6', '#8B5CF6', '#06B6D4', 'Classic blue professional theme', false),
('green', 'Forest Green', '#10B981', '#059669', '#34D399', 'Natural green energy theme', false),
('purple', 'Royal Purple', '#8B5CF6', '#7C3AED', '#A78BFA', 'Elegant purple luxury theme', false),
('orange', 'Sunset Orange', '#F59E0B', '#D97706', '#FBBF24', 'Warm and energetic orange theme', false),
('pink', 'Rose Pink', '#EC4899', '#DB2777', '#F472B6', 'Vibrant and modern pink theme', false),
('red', 'Fire Red', '#EF4444', '#DC2626', '#F87171', 'Bold and powerful red theme', false),
('indigo', 'Deep Indigo', '#6366F1', '#4F46E5', '#818CF8', 'Professional indigo theme', false),

-- Premium themes
('gold', 'Golden Luxury', '#F59E0B', '#D97706', '#FCD34D', 'Premium gold luxury theme', true),
('platinum', 'Platinum Elite', '#6B7280', '#4B5563', '#9CA3AF', 'Exclusive platinum theme', true),
('emerald', 'Emerald Premium', '#059669', '#047857', '#10B981', 'Premium emerald green theme', true),
('ruby', 'Ruby Premium', '#DC2626', '#B91C1C', '#EF4444', 'Premium ruby red theme', true),
('sapphire', 'Sapphire Elite', '#1D4ED8', '#1E40AF', '#3B82F6', 'Premium sapphire blue theme', true),
('amethyst', 'Amethyst Luxury', '#7C2D12', '#92400E', '#A16207', 'Premium amethyst theme', true);

-- Create user_theme_preferences table for advanced customization
CREATE TABLE IF NOT EXISTS user_theme_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  theme_color_id uuid REFERENCES theme_colors(id) ON DELETE SET NULL,
  custom_primary_color text,
  custom_secondary_color text,
  custom_accent_color text,
  auto_dark_mode boolean DEFAULT true,
  dark_mode_schedule jsonb DEFAULT '{"start": "18:00", "end": "06:00"}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure one preference per user
  UNIQUE(user_id)
);

-- Enable RLS on new tables
ALTER TABLE theme_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_theme_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for theme_colors (public read access)
CREATE POLICY "Theme colors viewable by everyone" ON theme_colors
  FOR SELECT USING (is_active = true);

-- RLS Policies for user_theme_preferences
CREATE POLICY "Users can view own theme preferences" ON user_theme_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own theme preferences" ON user_theme_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own theme preferences" ON user_theme_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own theme preferences" ON user_theme_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to get user's complete theme configuration
CREATE OR REPLACE FUNCTION get_user_theme_config(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  user_profile profiles%ROWTYPE;
  user_prefs user_theme_preferences%ROWTYPE;
  theme_color theme_colors%ROWTYPE;
  result jsonb;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile FROM profiles WHERE id = user_uuid;
  
  -- Get user theme preferences
  SELECT * INTO user_prefs FROM user_theme_preferences WHERE user_id = user_uuid;
  
  -- Get selected theme color if exists
  IF user_prefs.theme_color_id IS NOT NULL THEN
    SELECT * INTO theme_color FROM theme_colors WHERE id = user_prefs.theme_color_id;
  END IF;
  
  -- Build result
  result := jsonb_build_object(
    'profile_color', COALESCE(user_profile.profile_color, '#22C1C3'),
    'theme_preference', COALESCE(user_profile.theme_preference, 'system'),
    'custom_theme_colors', COALESCE(user_profile.custom_theme_colors, '{}'::jsonb)
  );
  
  -- Add theme preferences if they exist
  IF user_prefs IS NOT NULL THEN
    result := result || jsonb_build_object(
      'custom_primary_color', user_prefs.custom_primary_color,
      'custom_secondary_color', user_prefs.custom_secondary_color,
      'custom_accent_color', user_prefs.custom_accent_color,
      'auto_dark_mode', COALESCE(user_prefs.auto_dark_mode, true),
      'dark_mode_schedule', COALESCE(user_prefs.dark_mode_schedule, '{"start": "18:00", "end": "06:00"}'::jsonb)
    );
  END IF;
  
  -- Add selected theme color info if exists
  IF theme_color IS NOT NULL THEN
    result := result || jsonb_build_object(
      'selected_theme', jsonb_build_object(
        'name', theme_color.name,
        'display_name', theme_color.display_name,
        'primary_color', theme_color.primary_color,
        'secondary_color', theme_color.secondary_color,
        'accent_color', theme_color.accent_color,
        'is_premium', theme_color.is_premium
      )
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user theme preferences
CREATE OR REPLACE FUNCTION update_user_theme_preferences(
  user_uuid uuid,
  theme_color_name text DEFAULT NULL,
  custom_primary text DEFAULT NULL,
  custom_secondary text DEFAULT NULL,
  custom_accent text DEFAULT NULL,
  theme_pref text DEFAULT NULL,
  auto_dark boolean DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  theme_id uuid;
BEGIN
  -- Get theme color ID if theme name provided
  IF theme_color_name IS NOT NULL THEN
    SELECT id INTO theme_id FROM theme_colors WHERE name = theme_color_name AND is_active = true;
  END IF;
  
  -- Update profile basic theme settings
  UPDATE profiles SET
    profile_color = COALESCE(custom_primary, profile_color),
    theme_preference = COALESCE(theme_pref, theme_preference),
    updated_at = now()
  WHERE id = user_uuid;
  
  -- Insert or update user theme preferences
  INSERT INTO user_theme_preferences (
    user_id,
    theme_color_id,
    custom_primary_color,
    custom_secondary_color,
    custom_accent_color,
    auto_dark_mode,
    updated_at
  ) VALUES (
    user_uuid,
    theme_id,
    custom_primary,
    custom_secondary,
    custom_accent,
    COALESCE(auto_dark, true),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    theme_color_id = COALESCE(EXCLUDED.theme_color_id, user_theme_preferences.theme_color_id),
    custom_primary_color = COALESCE(EXCLUDED.custom_primary_color, user_theme_preferences.custom_primary_color),
    custom_secondary_color = COALESCE(EXCLUDED.custom_secondary_color, user_theme_preferences.custom_secondary_color),
    custom_accent_color = COALESCE(EXCLUDED.custom_accent_color, user_theme_preferences.custom_accent_color),
    auto_dark_mode = COALESCE(EXCLUDED.auto_dark_mode, user_theme_preferences.auto_dark_mode),
    updated_at = now();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_profile_color ON profiles(profile_color);
CREATE INDEX IF NOT EXISTS idx_profiles_theme_preference ON profiles(theme_preference);
CREATE INDEX IF NOT EXISTS idx_theme_colors_name ON theme_colors(name);
CREATE INDEX IF NOT EXISTS idx_theme_colors_is_active ON theme_colors(is_active);
CREATE INDEX IF NOT EXISTS idx_user_theme_preferences_user_id ON user_theme_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_theme_preferences_theme_color_id ON user_theme_preferences(theme_color_id);

-- Update existing users with default theme color (optional - only if you want to set for existing users)
-- UPDATE profiles SET profile_color = '#22C1C3' WHERE profile_color IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.profile_color IS 'Primary theme color for the user interface';
COMMENT ON COLUMN profiles.theme_preference IS 'User preference for light/dark theme or system default';
COMMENT ON COLUMN profiles.custom_theme_colors IS 'JSON object containing custom color overrides';
COMMENT ON TABLE theme_colors IS 'Predefined color themes available to users';
COMMENT ON TABLE user_theme_preferences IS 'Advanced theme customization preferences per user';
COMMENT ON FUNCTION get_user_theme_config(uuid) IS 'Returns complete theme configuration for a user';
COMMENT ON FUNCTION update_user_theme_preferences(uuid, text, text, text, text, text, boolean) IS 'Updates user theme preferences with validation';
