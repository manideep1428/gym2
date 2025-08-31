import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Booking, Profile } from '@/lib/supabase';
import { Calendar, Clock, User, MapPin } from 'lucide-react-native';
import { ClientBookingsSkeleton } from '@/components/SkeletonLoader';

export default function ClientBookings() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const [bookings, setBookings] = useState<(Booking & { trainer: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = createStyles(colors);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          trainer:profiles!trainer_id(*)
        `)
        .eq('client_id', userProfile.id)
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

  const renderBookingCard = ({ item: booking }: { item: Booking & { trainer: Profile } }) => (
    <TouchableOpacity style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.bookingHeader}>
        <View style={styles.bookingInfo}>
          <View style={styles.trainerInfo}>
            <User color={colors.textSecondary} size={16} />
            <Text style={[styles.trainerName, { color: colors.text }]}>{booking.trainer.name}</Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
          </View>
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

        <View style={styles.detailRow}>
          <MapPin color={colors.textSecondary} size={16} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {booking.duration_minutes} minutes
          </Text>
        </View>
      </View>

      {booking.client_notes && (
        <View style={styles.notesSection}>
          <Text style={[styles.notesLabel, { color: colors.text }]}>Notes:</Text>
          <Text style={[styles.notesText, { color: colors.textSecondary }]}>{booking.client_notes}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading bookings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>My Bookings</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {bookings.length} upcoming sessions
        </Text>
      </View>

      {bookings.length === 0 ? (
        <View style={styles.emptyState}>
          <Calendar color={colors.textSecondary} size={48} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No bookings yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Find a trainer and book your first session
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  loadingText: {
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
    marginBottom: 12,
  },
  bookingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trainerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trainerName: {
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
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
  },
});