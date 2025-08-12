import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Booking, Profile } from '@/lib/supabase';
import { Calendar, User, Clock, CircleCheck as CheckCircle, Circle as XCircle } from 'lucide-react-native';

export default function TrainerBookings() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const [bookings, setBookings] = useState<(Booking & { client: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = createStyles(colors);

  useEffect(() => {
    fetchBookings();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('trainer_bookings')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'bookings', filter: `trainer_id=eq.${userProfile?.id}` },
        () => fetchBookings()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userProfile]);

  const fetchBookings = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          client:profiles!client_id(*)
        `)
        .eq('trainer_id', userProfile.id)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) return;

      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;

      // If confirming a booking, auto-cancel conflicting bookings
      if (status === 'confirmed') {
        await handleConflictingBookings(booking);
      }

      // Send notification to client
      const notificationMessage = status === 'confirmed' 
        ? `Your session on ${formatDate(booking.date)} at ${formatTime(booking.start_time)} has been confirmed!`
        : `Your session on ${formatDate(booking.date)} at ${formatTime(booking.start_time)} has been cancelled.`;

      await supabase
        .from('notifications')
        .insert({
          user_id: booking.client_id,
          title: `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          message: notificationMessage,
          type: `booking_${status}`,
        });
      
      fetchBookings();
      Alert.alert('Success', `Booking ${status} successfully!`);
    } catch (error) {
      Alert.alert('Error', `Failed to ${status} booking`);
      console.error('Update booking error:', error);
    }
  };

  const handleConflictingBookings = async (confirmedBooking: any) => {
    try {
      // Find all pending bookings that conflict with the confirmed booking
      const { data: conflictingBookings, error } = await supabase
        .from('bookings')
        .select('*, client:profiles!client_id(name)')
        .eq('trainer_id', userProfile?.id)
        .eq('date', confirmedBooking.date)
        .eq('status', 'pending')
        .neq('id', confirmedBooking.id);

      if (error) throw error;

      if (conflictingBookings && conflictingBookings.length > 0) {
        // Check for time overlaps
        const confirmedStart = new Date(`2000-01-01T${confirmedBooking.start_time}`);
        const confirmedEnd = new Date(`2000-01-01T${confirmedBooking.end_time}`);

        for (const conflictBooking of conflictingBookings) {
          const conflictStart = new Date(`2000-01-01T${conflictBooking.start_time}`);
          const conflictEnd = new Date(`2000-01-01T${conflictBooking.end_time}`);

          // Check if sessions overlap
          if (confirmedStart < conflictEnd && confirmedEnd > conflictStart) {
            // Auto-cancel conflicting booking
            await supabase
              .from('bookings')
              .update({ status: 'cancelled' })
              .eq('id', conflictBooking.id);

            // Send notification to affected client
            await supabase
              .from('notifications')
              .insert({
                user_id: conflictBooking.client_id,
                title: 'Booking Cancelled',
                message: `Your session request on ${formatDate(conflictBooking.date)} at ${formatTime(conflictBooking.start_time)} was cancelled because the trainer confirmed another booking for the same time slot.`,
                type: 'booking_cancelled',
              });
          }
        }
      }
    } catch (error) {
      console.error('Error handling conflicting bookings:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return colors.success;
      case 'pending': return colors.warning;
      case 'completed': return colors.textSecondary;
      case 'cancelled': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
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

  const renderBookingCard = ({ item: booking }: { item: Booking & { client: Profile } }) => (
    <View style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.bookingHeader}>
        <View style={styles.clientInfo}>
          <User color={colors.textSecondary} size={16} />
          <Text style={[styles.clientName, { color: colors.text }]}>{booking.client.name}</Text>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.bookingDetails}>
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

      {booking.client_notes && (
        <View style={styles.notesSection}>
          <Text style={[styles.notesLabel, { color: colors.text }]}>Client Notes:</Text>
          <Text style={[styles.notesText, { color: colors.textSecondary }]}>{booking.client_notes}</Text>
        </View>
      )}

      {booking.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.confirmButton, { backgroundColor: colors.success }]}
            onPress={() => updateBookingStatus(booking.id, 'confirmed')}
          >
            <CheckCircle color="#FFFFFF" size={16} />
            <Text style={styles.actionButtonText}>Confirm</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton, { backgroundColor: colors.error }]}
            onPress={() => updateBookingStatus(booking.id, 'cancelled')}
          >
            <XCircle color="#FFFFFF" size={16} />
            <Text style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {booking.status === 'confirmed' && (
        <TouchableOpacity
          style={[styles.completeButton, { backgroundColor: colors.primary }]}
          onPress={() => updateBookingStatus(booking.id, 'completed')}
        >
          <CheckCircle color="#FFFFFF" size={16} />
          <Text style={styles.actionButtonText}>Mark Complete</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Bookings</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {bookings.filter(b => b.status === 'pending').length} pending requests
        </Text>
      </View>

      {bookings.length === 0 ? (
        <View style={styles.emptyState}>
          <Calendar color={colors.textSecondary} size={48} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No bookings yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Bookings will appear here when clients book sessions
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBookingCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.bookingsList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  bookingsList: {
    paddingHorizontal: 20,
  },
  bookingCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bookingDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
  },
  notesSection: {
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  confirmButton: {},
  cancelButton: {},
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
});