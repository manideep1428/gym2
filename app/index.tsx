import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Redirect } from 'expo-router';
import LoadingScreen from '@/components/LoadingScreen';

export default function Index() {
  const { user, userProfile, loading } = useAuth();
  const { colors } = useTheme();

  console.log('Index - Loading:', loading, 'User:', !!user, 'Profile:', userProfile?.role);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    console.log('No user, redirecting to auth');
    return <Redirect href="/auth" />;
  }

  // Wait for profile to be loaded before redirecting
  if (!userProfile) {
    console.log('User exists but no profile yet, showing loading');
    return <LoadingScreen />;
  }

  if (userProfile.role === 'trainer') {
    console.log('Redirecting to trainer dashboard');
    return <Redirect href="/(trainer)" />;
  } else {
    console.log('Redirecting to client dashboard');
    return <Redirect href="/(client)" />;
  }
}