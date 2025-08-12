import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Redirect } from 'expo-router';
import LoadingScreen from '@/components/LoadingScreen';

export default function Index() {
  const { user, userProfile, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Redirect href="/auth" />;
  }

  if (userProfile?.role === 'trainer') {
    return <Redirect href="/(trainer)" />;
  } else {
    return <Redirect href="/(client)" />;
  }
}