import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import NotificationService from '@/lib/notificationService';
import { supabase } from '@/lib/supabase';
import { Bell, TestTube, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';

export default function NotificationTester() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const styles = createStyles(colors);

  const addResult = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setResults(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const testNotificationPermissions = async () => {
    try {
      addResult('Testing notification permissions...', 'info');
      const notificationService = NotificationService.getInstance();
      const hasPermission = await notificationService.requestPermissions();
      
      if (hasPermission) {
        addResult('✅ Notification permissions granted', 'success');
      } else {
        addResult('❌ Notification permissions denied', 'error');
      }
      
      return hasPermission;
    } catch (error) {
      addResult(`❌ Permission test failed: ${error}`, 'error');
      return false;
    }
  };

  const testPushTokenGeneration = async () => {
    try {
      addResult('Testing push token generation...', 'info');
      const notificationService = NotificationService.getInstance();
      const token = await notificationService.getExpoPushToken();
      
      if (token) {
        addResult(`✅ Push token generated: ${token.substring(0, 20)}...`, 'success');
      } else {
        addResult('❌ Failed to generate push token', 'error');
      }
      
      return token;
    } catch (error) {
      addResult(`❌ Push token test failed: ${error}`, 'error');
      return null;
    }
  };

  const testInAppNotification = async () => {
    if (!userProfile) return false;
    
    try {
      addResult('Testing in-app notification creation...', 'info');
      const notificationService = NotificationService.getInstance();
      
      await notificationService.createInAppNotification(
        userProfile.id,
        'Test In-App Notification',
        'This is a test in-app notification created by the notification tester',
        'booking_request',
        { test: true, timestamp: new Date().toISOString() }
      );
      
      addResult('✅ In-app notification created successfully', 'success');
      return true;
    } catch (error) {
      addResult(`❌ In-app notification test failed: ${error}`, 'error');
      return false;
    }
  };

  const testLocalNotification = async () => {
    try {
      addResult('Testing local notification...', 'info');
      const notificationService = NotificationService.getInstance();
      
      await notificationService.sendLocalNotification(
        'Test Local Notification',
        'This is a test local notification from the notification tester',
        { type: 'booking_request', test: true }
      );
      
      addResult('✅ Local notification sent successfully', 'success');
      return true;
    } catch (error) {
      addResult(`❌ Local notification test failed: ${error}`, 'error');
      return false;
    }
  };

  const testPushNotification = async () => {
    if (!userProfile) return false;
    
    try {
      addResult('Testing push notification...', 'info');
      
      // Get user's push token
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', userProfile.id)
        .single();

      if (!profile?.push_token) {
        addResult('❌ No push token found - register for notifications first', 'error');
        return false;
      }

      const notificationService = NotificationService.getInstance();
      await notificationService.sendPushNotification(
        profile.push_token,
        'Test Push Notification',
        'This is a test push notification from the notification tester',
        { type: 'booking_request', test: true }
      );
      
      addResult('✅ Push notification sent successfully', 'success');
      return true;
    } catch (error) {
      addResult(`❌ Push notification test failed: ${error}`, 'error');
      return false;
    }
  };

  const testNotificationRegistration = async () => {
    if (!userProfile) return false;
    
    try {
      addResult('Testing notification registration...', 'info');
      const notificationService = NotificationService.getInstance();
      
      await notificationService.registerForPushNotifications(userProfile.id);
      addResult('✅ Notification registration completed', 'success');
      return true;
    } catch (error) {
      addResult(`❌ Notification registration failed: ${error}`, 'error');
      return false;
    }
  };

  const runFullTest = async () => {
    if (!userProfile) {
      Alert.alert('Error', 'Please log in to test notifications');
      return;
    }

    setTesting(true);
    setResults([]);
    
    addResult('🚀 Starting comprehensive notification test...', 'info');
    
    // Test 1: Permissions
    const hasPermissions = await testNotificationPermissions();
    
    // Test 2: Registration
    if (hasPermissions) {
      await testNotificationRegistration();
    }
    
    // Test 3: Push token
    const token = await testPushTokenGeneration();
    
    // Test 4: In-app notification
    await testInAppNotification();
    
    // Test 5: Local notification
    await testLocalNotification();
    
    // Test 6: Push notification (if token exists)
    if (token) {
      await testPushNotification();
    }
    
    addResult('🏁 Notification test completed!', 'info');
    setTesting(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  const getResultIcon = (result: string) => {
    if (result.includes('✅')) return <CheckCircle color={colors.success} size={16} />;
    if (result.includes('❌')) return <XCircle color={colors.error} size={16} />;
    return <AlertCircle color={colors.warning} size={16} />;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Bell color={colors.primary} size={24} />
        <Text style={[styles.title, { color: colors.text }]}>Notification Tester</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={runFullTest}
          disabled={testing}
        >
          <TestTube color="#FFFFFF" size={20} />
          <Text style={styles.buttonText}>
            {testing ? 'Testing...' : 'Run Full Test'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
          onPress={clearResults}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
        <Text style={[styles.resultsTitle, { color: colors.text }]}>Test Results:</Text>
        {results.length === 0 ? (
          <Text style={[styles.noResults, { color: colors.textSecondary }]}>
            No test results yet. Run a test to see results here.
          </Text>
        ) : (
          results.map((result, index) => (
            <View key={index} style={[styles.resultItem, { borderColor: colors.border }]}>
              {getResultIcon(result)}
              <Text style={[styles.resultText, { color: colors.text }]}>{result}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={[styles.infoContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.infoTitle, { color: colors.text }]}>Instructions:</Text>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          • Run on a physical device (not simulator){'\n'}
          • Grant notification permissions when prompted{'\n'}
          • Check console logs for detailed information{'\n'}
          • Test different notification types in the app
        </Text>
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    maxHeight: 200,
    marginBottom: 20,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  noResults: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  resultText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  infoContainer: {
    padding: 16,
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
