import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, Profile } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { router } from 'expo-router';

interface AuthContextType {
  user: User | null;
  userProfile: Profile | null;
  loading: boolean;
  isTrainer: boolean;
  isClient: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, userData: Partial<Profile>) => Promise<any>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        await fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setLoading(true);
        if (event === 'SIGNED_IN' && session) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        setUserProfile(null);
        return;
      }

      if (!profile) {
        setUserProfile(null);
        return;
      }

      setUserProfile(profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setUserProfile(null);
      // Don't throw error, just set profile to null
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;

      // Set user immediately
      setUser(data.user);

      // Fetch profile after successful login
      if (data.user) {
        await fetchUserProfile(data.user.id);
      }

      setLoading(false);
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      setLoading(false);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, userData: Partial<Profile>) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name,
            phone: userData.phone || '',
            role: userData.role || 'client',
            bio: userData.bio || '',
            specializations: userData.specializations || [],
            experience_years: userData.experience_years || 0,
          }
        }
      });

      if (authError) throw authError;

      // Create profile immediately for confirmed users or when email confirmation is disabled
      if (authData.user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: authData.user.id,
              name: userData.name!,
              phone: userData.phone || '',
              email: authData.user.email!,
              role: userData.role!,
              bio: userData.bio || '',
              specializations: userData.specializations || [],
              experience_years: userData.experience_years || 0,
            }, {
              onConflict: 'id'
            })
            .select()
            .single();

          if (profileError) {
            console.error('Profile upsert failed:', profileError);
            // Don't throw - trigger will handle this
          } else if (profile) {
            // Set the profile immediately so it's available for routing
            setUserProfile(profile);
          }
        } catch (profileError) {
          console.error('Profile creation error:', profileError);
          // Continue - trigger will handle this
        }
      }

      return authData;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Navigate to register screen after successful signout
      router.replace('/auth/register');
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) throw error;
    
    // Refresh profile
    await fetchUserProfile(user.id);
  };

  const refreshProfile = async () => {
    if (!user) return;
    await fetchUserProfile(user.id);
  };

  const isTrainer = userProfile?.role === 'trainer';
  const isClient = userProfile?.role === 'client';

  const value = {
    user,
    userProfile,
    loading,
    isTrainer,
    isClient,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};