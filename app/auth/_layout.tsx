import React from 'react';
import { StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { View } from 'react-native';

export default function AuthLayout() {
  return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack>
  );
}
