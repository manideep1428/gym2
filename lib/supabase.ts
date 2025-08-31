import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = "https://tkmfroaywhdwsarnaecj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbWZyb2F5d2hkd3Nhcm5hZWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTIyNjAsImV4cCI6MjA3MDU2ODI2MH0.9s0NP7mu5GKtsc1ELq6Le3fpNYCgYo2O-Ixad9_YDMY"

// Validate configuration
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'gymbook-app',
    },
  },
  db: {
    schema: 'public',
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
});

// Database types
export interface Profile {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'client' | 'trainer';
  avatar_url?: string;
  bio?: string;
  specializations?: string[];
  experience_years?: number;
  fitness_goals?: string;
  rating?: number;
  total_reviews?: number;
  created_at: string;
  updated_at: string;
}

export interface TrainingPackage {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  session_count: number;
  duration_days: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface Booking {
  id: string;
  client_id: string;
  trainer_id: string;
  package_id?: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  client_notes?: string;
  trainer_notes?: string;
  created_at: string;
}

export interface TrainerAvailability {
  id: string;
  trainer_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  specific_date?: string;
  is_blocked: boolean;
  created_at: string;
}

export interface PaymentRequest {
  id: string;
  client_id: string;
  trainer_id: string;
  package_id?: string;
  amount: number;
  description: string;
  status: 'pending' | 'paid_by_user' | 'approved' | 'rejected';
  due_date: string;
  paid_date?: string;
  approved_date?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}