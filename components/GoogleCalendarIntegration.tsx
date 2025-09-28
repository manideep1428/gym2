import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { googleCalendarService } from '@/lib/googleCalendar';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react-native';
import { Svg, Path } from 'react-native-svg';

// Google Icon Component
const GoogleIcon = ({ size = 24, color = '#4285F4' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      fill={color}
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <Path
      fill={color}
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <Path
      fill={color}
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <Path
      fill={color}
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </Svg>
);

interface GoogleCalendarIntegrationProps {
  onConnectionChange?: (connected: boolean) => void;
}

export default function GoogleCalendarIntegration({ onConnectionChange }: GoogleCalendarIntegrationProps) {
  const { colors } = useTheme();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const styles = createStyles(colors);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setIsChecking(true);
      const status = await googleCalendarService.getConnectionStatus();
      const finalStatus = status.isConnected && status.isSignedIn && status.hasPlayServices;
      
      setIsConnected(finalStatus);
      onConnectionChange?.(finalStatus);

      // Show warning if Google Play Services not available
      if (!status.hasPlayServices) {
        console.warn('Google Play Services not available - Calendar integration may not work');
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
      setIsConnected(false);
      onConnectionChange?.(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      
      const tokens = await googleCalendarService.authenticateWithGoogle();
      
      if (tokens) {
        setIsConnected(true);
        onConnectionChange?.(true);
        Alert.alert(
          'Success!',
          'Google Calendar has been connected successfully. You can now sync your training sessions to your calendar.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to connect to Google Calendar. Please try again.');
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      Alert.alert('Connection Error', error.message || 'Failed to connect to Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect Google Calendar',
      'Are you sure you want to disconnect your Google Calendar? This will remove access to sync training sessions.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await googleCalendarService.disconnect();
              await googleCalendarService.signOut();
              
              setIsConnected(false);
              onConnectionChange?.(false);
              
              Alert.alert('Disconnected', 'Google Calendar has been disconnected successfully.');
            } catch (error) {
              console.error('Disconnect error:', error);
              Alert.alert('Error', 'Failed to disconnect Google Calendar');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.actionButton,
          {
            backgroundColor: isConnected ? colors.surface : colors.primary,
            borderColor: isConnected ? colors.border : colors.primary,
            borderWidth: isConnected ? 1 : 0,
          }
        ]}
        onPress={isConnected ? handleDisconnect : handleConnect}
        disabled={isLoading || isChecking}
      >
        {(isLoading || isChecking) ? (
          <>
            <ActivityIndicator size="small" color={isConnected ? colors.text : '#FFFFFF'} />
            <Text style={[
              styles.actionButtonText,
              { color: isConnected ? colors.text : '#FFFFFF' }
            ]}>
              {isChecking ? 'Checking...' : (isConnected ? 'Disconnecting...' : 'Connecting...')}
            </Text>
          </>
        ) : (
          <>
            {isConnected ? (
              <XCircle color={colors.error} size={20} />
            ) : (
              <GoogleIcon size={20} color="#FFFFFF" />
            )}
            <Text style={[
              styles.actionButtonText,
              { color: isConnected ? colors.error : '#FFFFFF' }
            ]}>
              {isConnected ? 'Disconnect' : 'Connect Google Calendar'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {isConnected && (
        <TouchableOpacity
          style={[styles.refreshButton, { borderColor: colors.border }]}
          onPress={checkConnectionStatus}
          disabled={isLoading || isChecking}
        >
          <RefreshCw color={colors.textSecondary} size={16} />
          <Text style={[styles.refreshButtonText, { color: colors.textSecondary }]}>
            Refresh Status
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 16, // Reduced from 20
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 100, // Ensure consistent width
  },
  statusText: {
    fontSize: 12, // Reduced from 14
    fontWeight: '600',
    letterSpacing: 0.25,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  description: {
    fontSize: 13, // Reduced from 15
    lineHeight: 20, // Adjusted line height
    marginBottom: 20,
    opacity: 0.8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 14, // Reduced from 16
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  refreshButtonText: {
    fontSize: 12, // Reduced from 14
    fontWeight: '500',
    letterSpacing: 0.25,
  },
  checkingText: {
    fontSize: 12, // Reduced from 14
    marginTop: 10,
    fontWeight: '500',
  },
});
