import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from '@/node_modules/.pnpm/expo-status-bar@3.0.8_react_fdaaae43ec7bc36f61b01e42b40372de/node_modules/expo-status-bar/build/StatusBar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { setupCrashHandlers } from '@/utils/crashHandler';
import NotificationInitializer from '@/components/NotificationInitializer';

export default function RootLayout() {
  useFrameworkReady();
  
  useEffect(() => {
    // Setup crash handlers for production debugging
    setupCrashHandlers();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <NotificationInitializer />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="auth" />
                  <Stack.Screen name="(client)" />
                  <Stack.Screen name="(trainer)" />
                  <Stack.Screen name="+not-found" />
                </Stack>
              <StatusBar style="auto" />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}