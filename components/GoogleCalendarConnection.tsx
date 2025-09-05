import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { googleCalendarService } from '@/lib/googleCalendar';
import { Calendar, Link, Unlink, CheckCircle } from 'lucide-react-native';

interface GoogleCalendarConnectionProps {
  onConnectionChange?: (connected: boolean) => void;
}

export default function GoogleCalendarConnection({ onConnectionChange }: GoogleCalendarConnectionProps) {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [loading, setLoading] = useState(true);

  const styles = createStyles(colors);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const connected = await googleCalendarService.isConnected();
      setIsConnected(connected);
      onConnectionChange?.(connected);
    } catch (error) {
      console.error('Error checking calendar connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!userProfile) {
      Alert.alert('Error', 'Please log in to connect Google Calendar');
      return;
    }

    setIsConnecting(true);
    try {
      const tokens = await googleCalendarService.authenticateWithGoogle();
      
      if (tokens) {
        setIsConnected(true);
        onConnectionChange?.(true);
        Alert.alert(
          'Success!',
          'Google Calendar has been connected successfully. You can now add your training sessions to your calendar.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Cancelled', 'Google Calendar connection was cancelled.');
      }
    } catch (error: any) {
      console.error('Calendar connection error:', error);
      Alert.alert(
        'Connection Failed',
        error.message || 'Failed to connect to Google Calendar. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Google Calendar',
      'Are you sure you want to disconnect Google Calendar? You won\'t be able to add new sessions to your calendar until you reconnect.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: performDisconnect },
      ]
    );
  };

  const performDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await googleCalendarService.disconnect();
      setIsConnected(false);
      onConnectionChange?.(false);
      Alert.alert('Disconnected', 'Google Calendar has been disconnected.');
    } catch (error: any) {
      console.error('Calendar disconnection error:', error);
      Alert.alert(
        'Disconnection Failed',
        error.message || 'Failed to disconnect Google Calendar. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Checking calendar connection...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Calendar color={colors.primary} size={24} />
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Google Calendar</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isConnected 
              ? 'Connected - Add sessions to your calendar' 
              : 'Connect to add training sessions to your calendar'
            }
          </Text>
        </View>
        {isConnected && (
          <CheckCircle color={colors.success} size={20} />
        )}
      </View>

      <View style={styles.actions}>
        {!isConnected ? (
          <TouchableOpacity
            style={[styles.connectButton, { backgroundColor: colors.primary }]}
            onPress={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Link color="#FFFFFF" size={16} />
            )}
            <Text style={styles.connectButtonText}>
              {isConnecting ? 'Connecting...' : 'Connect Google Calendar'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.disconnectButton, { borderColor: colors.error }]}
            onPress={handleDisconnect}
            disabled={isDisconnecting}
          >
            {isDisconnecting ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Unlink color={colors.error} size={16} />
            )}
            <Text style={[styles.disconnectButtonText, { color: colors.error }]}>
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isConnected && (
        <View style={[styles.infoBox, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]}>
          <Text style={[styles.infoText, { color: colors.success }]}>
            ✓ When trainers confirm your bookings, you'll see an "Add to Calendar" button to add the session to your Google Calendar.
          </Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  loadingText: {
    fontSize: 14,
    marginLeft: 8,
  },
  actions: {
    marginBottom: 12,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  disconnectButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
