/*
  # GymBook Database Schema with Admin Role Support
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('client', 'trainer')),
  avatar_url text,
  bio text,
  specializations text[] DEFAULT '{}',
  experience_years integer DEFAULT 0,
  rating decimal(2,1) DEFAULT 0.0,
  total_reviews integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trainer availability
CREATE TABLE IF NOT EXISTS trainer_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time,
  end_time time,
  is_recurring boolean DEFAULT true,
  specific_date date,
  is_blocked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Training packages
CREATE TABLE IF NOT EXISTS training_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  price decimal(10,2) NOT NULL,
  session_count integer NOT NULL,
  duration_days integer NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- User package purchases
CREATE TABLE IF NOT EXISTS user_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES training_packages(id) ON DELETE CASCADE,
  sessions_remaining integer NOT NULL,
  sessions_completed integer DEFAULT 0,
  purchase_date timestamptz DEFAULT now(),
  expiry_date timestamptz NOT NULL,
  is_active boolean DEFAULT true
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_id uuid REFERENCES user_packages(id) ON DELETE SET NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  duration_minutes integer NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  client_notes text,
  trainer_notes text,
  created_at timestamptz DEFAULT now()
);

-- Progress tracking
CREATE TABLE IF NOT EXISTS progress_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  progress_photos text[] DEFAULT '{}',
  measurements jsonb DEFAULT '{}',
  exercises jsonb DEFAULT '{}',
  client_notes text,
  trainer_feedback text,
  recorded_date timestamptz DEFAULT now()
);

-- Payment requests
CREATE TABLE IF NOT EXISTS payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_id uuid REFERENCES training_packages(id) ON DELETE SET NULL,
  amount decimal(10,2) NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid_by_user', 'approved', 'rejected')),
  due_date date,
  paid_date timestamptz,
  approved_date timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Contracts
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES user_packages(id) ON DELETE CASCADE,
  contract_pdf_url text,
  is_signed boolean DEFAULT false,
  signed_date timestamptz,
  terms_agreed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "User can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trainer availability
CREATE POLICY "Availability viewable by everyone" ON trainer_availability
  FOR SELECT USING (true);

CREATE POLICY "Trainers/Admin manage own availability" ON trainer_availability
  FOR ALL USING (
    trainer_id = auth.uid() OR
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Training packages
CREATE POLICY "Packages viewable by everyone" ON training_packages
  FOR SELECT USING (true);

CREATE POLICY "Admins or trainers manage packages" ON training_packages
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('trainer', 'admin')
    )
  );

-- Bookings
CREATE POLICY "Relevant bookings visible" ON bookings
  FOR SELECT USING (
    auth.uid() = client_id OR 
    auth.uid() = trainer_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "Relevant bookings managed" ON bookings
  FOR ALL USING (
    auth.uid() = client_id OR 
    auth.uid() = trainer_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- User packages
CREATE POLICY "Relevant packages visible" ON user_packages
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "Relevant packages managed" ON user_packages
  FOR ALL USING (
    auth.uid() = user_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Progress tracking
CREATE POLICY "Relevant progress visible" ON progress_tracking
  FOR SELECT USING (
    auth.uid() = client_id OR 
    auth.uid() = trainer_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "Relevant progress managed" ON progress_tracking
  FOR ALL USING (
    auth.uid() = client_id OR 
    auth.uid() = trainer_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Payment requests
CREATE POLICY "Relevant payments visible" ON payment_requests
  FOR SELECT USING (
    auth.uid() = client_id OR 
    auth.uid() = trainer_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "Relevant payments managed" ON payment_requests
  FOR ALL USING (
    auth.uid() = client_id OR 
    auth.uid() = trainer_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Contracts
CREATE POLICY "Relevant contracts visible" ON contracts
  FOR SELECT USING (
    auth.uid() = client_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "Relevant contracts managed" ON contracts
  FOR ALL USING (
    auth.uid() = client_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Notifications
CREATE POLICY "View own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "System insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_trainer_availability_trainer_id ON trainer_availability(trainer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_trainer_id ON bookings(trainer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
