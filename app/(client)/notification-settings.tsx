import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Bell, ArrowLeft, Smartphone, Calendar, MessageSquare } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';
import { supabase } from '@/lib/supabase';

interface NotificationSettings {
  pushNotifications: boolean;
  bookingConfirmations: boolean;
  bookingRejections: boolean;
  sessionReminders: boolean;
  cancellations: boolean;
  reminderTime: number; // minutes before session
}

export default function ClientNotificationSettings() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();
  
  const [settings, setSettings] = useState<NotificationSettings>({
    pushNotifications: false,
    bookingConfirmations: true,
    bookingRejections: true,
    sessionReminders: true,
    cancellations: true,
    reminderTime: 10,
  });
  
  const [loading, setLoading] = useState(true);

  const styles = createStyles(colors);

  useEffect(() => {
    loadNotificationSettings();
    checkNotificationPermissions();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userProfile?.id)
        .single();

      if (data) {
        setSettings({
          pushNotifications: data.push_notifications,
          bookingConfirmations: data.booking_confirmations,
          bookingRejections: data.booking_confirmations, // Using same field for both
          sessionReminders: data.session_reminders,
          cancellations: data.cancellations,
          reminderTime: data.reminder_time || 10,
        });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkNotificationPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setSettings(prev => ({ ...prev, pushNotifications: status === 'granted' }));
  };

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    
    if (status === 'granted') {
      setSettings(prev => ({ ...prev, pushNotifications: true }));
      await saveNotificationSettings({ ...settings, pushNotifications: true });
      
      // Get push token
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      
      // Save token to user profile
      await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userProfile?.id);
        
      Alert.alert('Success', 'Push notifications enabled successfully!');
    } else {
      Alert.alert(
        'Permission Required',
        'Please enable notifications in your device settings to receive booking updates.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
    }
  };

  const saveNotificationSettings = async (newSettings: NotificationSettings) => {
    try {
      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          user_id: userProfile?.id,
          push_notifications: newSettings.pushNotifications,
          booking_requests: false, // Clients don't receive booking requests
          booking_confirmations: newSettings.bookingConfirmations,
          session_reminders: newSettings.sessionReminders,
          cancellations: newSettings.cancellations,
          reminder_time: newSettings.reminderTime,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert('Error', 'Failed to save notification settings. Please try again.');
    }
  };

  const handleToggle = async (key: keyof NotificationSettings, value: boolean) => {
    if (key === 'pushNotifications' && value) {
      await requestNotificationPermissions();
      return;
    }

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await saveNotificationSettings(newSettings);
  };

  const handleReminderTimeChange = (minutes: number) => {
    const newSettings = { ...settings, reminderTime: minutes };
    setSettings(newSettings);
    saveNotificationSettings(newSettings);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Notification Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Push Notifications */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Push Notifications</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Enable push notifications to receive real-time updates about your bookings
          </Text>
          
          <View style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <Smartphone color={colors.textSecondary} size={20} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingText, { color: colors.text }]}>Push Notifications</Text>
                <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>
                  {settings.pushNotifications ? 'Enabled' : 'Tap to enable'}
                </Text>
              </View>
            </View>
            <Switch
              value={settings.pushNotifications}
              onValueChange={(value) => handleToggle('pushNotifications', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Notification Types */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Notification Types</Text>
          
          <View style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <MessageSquare color={colors.textSecondary} size={20} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingText, { color: colors.text }]}>Booking Confirmations</Text>
                <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>
                  When trainers accept your booking requests
                </Text>
              </View>
            </View>
            <Switch
              value={settings.bookingConfirmations}
              onValueChange={(value) => handleToggle('bookingConfirmations', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
              disabled={!settings.pushNotifications}
            />
          </View>

          <View style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <Bell color={colors.textSecondary} size={20} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingText, { color: colors.text }]}>Booking Rejections</Text>
                <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>
                  When trainers decline your booking requests
                </Text>
              </View>
            </View>
            <Switch
              value={settings.bookingRejections}
              onValueChange={(value) => handleToggle('bookingRejections', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
              disabled={!settings.pushNotifications}
            />
          </View>

          <View style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <Calendar color={colors.textSecondary} size={20} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingText, { color: colors.text }]}>Session Reminders</Text>
                <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>
                  Reminders before your sessions start
                </Text>
              </View>
            </View>
            <Switch
              value={settings.sessionReminders}
              onValueChange={(value) => handleToggle('sessionReminders', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
              disabled={!settings.pushNotifications}
            />
          </View>

          <View style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <Bell color={colors.textSecondary} size={20} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingText, { color: colors.text }]}>Cancellations</Text>
                <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>
                  When sessions are cancelled
                </Text>
              </View>
            </View>
            <Switch
              value={settings.cancellations}
              onValueChange={(value) => handleToggle('cancellations', value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
              disabled={!settings.pushNotifications}
            />
          </View>
        </View>

        {/* Reminder Timing */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Reminder Timing</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Choose when to receive session reminders
          </Text>
          
          <View style={styles.reminderOptions}>
            {[5, 10, 15, 30].map((minutes) => (
              <TouchableOpacity
                key={minutes}
                style={[
                  styles.reminderOption,
                  {
                    backgroundColor: settings.reminderTime === minutes ? colors.primary : colors.card,
                    borderColor: settings.reminderTime === minutes ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => handleReminderTimeChange(minutes)}
                disabled={!settings.pushNotifications || !settings.sessionReminders}
              >
                <Text
                  style={[
                    styles.reminderOptionText,
                    {
                      color: settings.reminderTime === minutes ? '#FFFFFF' : colors.text,
                    }
                  ]}
                >
                  {minutes} min
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  reminderOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  reminderOption: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reminderOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
});
