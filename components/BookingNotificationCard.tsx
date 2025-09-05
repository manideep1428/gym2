import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { googleCalendarService } from '@/lib/googleCalendar';
import { Calendar, CalendarPlus, CheckCircle, Clock, User } from 'lucide-react-native';

interface BookingNotificationCardProps {
  booking: any;
  userRole: 'client' | 'trainer';
  onCalendarAdded?: () => void;
}

export default function BookingNotificationCard({ 
  booking, 
  userRole, 
  onCalendarAdded 
}: BookingNotificationCardProps) {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const [addingToCalendar, setAddingToCalendar] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);

  const styles = createStyles(colors);

  React.useEffect(() => {
    checkCalendarConnection();
  }, []);

  const checkCalendarConnection = async () => {
    try {
      const connected = await googleCalendarService.isConnected();
      setCalendarConnected(connected);
    } catch (error) {
      console.error('Error checking calendar connection:', error);
    }
  };

  const handleAddToCalendar = async () => {
    if (!calendarConnected) {
      Alert.alert(
        'Google Calendar Not Connected',
        'Please connect your Google Calendar in the account settings to add sessions to your calendar.',
        [{ text: 'OK' }]
      );
      return;
    }

    setAddingToCalendar(true);
    try {
      await googleCalendarService.addBookingToCalendar(booking, userRole);
      Alert.alert(
        'Added to Calendar',
        'The training session has been added to your Google Calendar.',
        [{ text: 'OK' }]
      );
      onCalendarAdded?.();
    } catch (error: any) {
      console.error('Error adding to calendar:', error);
      Alert.alert(
        'Failed to Add to Calendar',
        error.message || 'Could not add the session to your calendar. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setAddingToCalendar(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isCalendarAdded = userRole === 'client' 
    ? booking.calendar_added_by_client 
    : booking.calendar_added_by_trainer;

  if (booking.status !== 'confirmed') {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.statusBadge, { backgroundColor: colors.success + '20' }]}>
          <CheckCircle color={colors.success} size={16} />
          <Text style={[styles.statusText, { color: colors.success }]}>Confirmed</Text>
        </View>
      </View>

      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <User color={colors.textSecondary} size={16} />
          <Text style={[styles.detailText, { color: colors.text }]}>
            {userRole === 'client' ? booking.trainer?.name : booking.client?.name}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Calendar color={colors.textSecondary} size={16} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {formatDate(booking.date)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Clock color={colors.textSecondary} size={16} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
          </Text>
        </View>
      </View>

      {!isCalendarAdded && calendarConnected && (
        <TouchableOpacity
          style={[styles.calendarButton, { backgroundColor: colors.primary }]}
          onPress={handleAddToCalendar}
          disabled={addingToCalendar}
        >
          {addingToCalendar ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <CalendarPlus color="#FFFFFF" size={16} />
          )}
          <Text style={styles.calendarButtonText}>
            {addingToCalendar ? 'Adding to Calendar...' : 'Add to Google Calendar'}
          </Text>
        </TouchableOpacity>
      )}

      {!isCalendarAdded && !calendarConnected && (
        <View style={[styles.infoBox, { backgroundColor: colors.warning + '10', borderColor: colors.warning + '30' }]}>
          <Text style={[styles.infoText, { color: colors.warning }]}>
            Connect Google Calendar in account settings to add this session to your calendar
          </Text>
        </View>
      )}

      {isCalendarAdded && (
        <View style={[styles.calendarAdded, { backgroundColor: colors.success + '20' }]}>
          <CheckCircle color={colors.success} size={16} />
          <Text style={[styles.calendarAddedText, { color: colors.success }]}>
            Added to Google Calendar
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bookingDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '500',
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  calendarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  calendarAdded: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  calendarAddedText: {
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
    textAlign: 'center',
  },
});
