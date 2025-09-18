import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Booking, Profile } from '@/lib/supabase';
import { googleCalendarService } from '@/lib/googleCalendar';
import { Calendar, Clock, User, MapPin, CalendarPlus } from 'lucide-react-native';
import { ClientBookingsSkeleton, DetailedBookingCardSkeleton } from '@/components/SkeletonLoader';
import BookingNotificationCard from '@/components/BookingNotificationCard';

export default function ClientBookings() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const [bookings, setBookings] = useState<(Booking & { trainer: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarConnected, setCalendarConnected] = useState(false);

  const styles = createStyles(colors);

  useEffect(() => {
    fetchBookings();
    checkCalendarConnection();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('client_bookings')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'bookings', filter: `client_id=eq.${userProfile?.id}` },
        () => fetchBookings()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userProfile]);

  const checkCalendarConnection = async () => {
    try {
      const connected = await googleCalendarService.isConnected();
      setCalendarConnected(connected);
    } catch (error) {
      console.error('Error checking calendar connection:', error);
    }
  };

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

      {booking.status === 'confirmed' && (
        <View style={styles.calendarSection}>
          {booking.calendar_added_by_client ? (
            <View style={[styles.calendarAdded, { backgroundColor: colors.success + '20' }]}>
              <CalendarPlus color={colors.success} size={16} />
              <Text style={[styles.calendarAddedText, { color: colors.success }]}>
                Added to Google Calendar
              </Text>
            </View>
          ) : (
            <Text style={[styles.calendarHint, { color: colors.textSecondary }]}>
              Add this session to your Google Calendar using the notification below
            </Text>
          )}
        </View>
      )}

      {booking.client_notes && (
        <View style={styles.notesSection}>
          <Text style={[styles.notesLabel, { color: colors.text }]}>Notes:</Text>
          <Text style={[styles.notesText, { color: colors.textSecondary }]}>{booking.client_notes}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // Separate confirmed bookings for notification cards
  const confirmedBookings = bookings.filter(booking => booking.status === 'confirmed');

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>My Bookings</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Loading sessions...
            </Text>
          </View>

          <View style={styles.bookingsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>All Bookings</Text>
            
            <View style={styles.bookingsList}>
              <DetailedBookingCardSkeleton />
              <DetailedBookingCardSkeleton />
              <DetailedBookingCardSkeleton />
              <DetailedBookingCardSkeleton />
              <DetailedBookingCardSkeleton />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>My Bookings</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          </Text>
        </View>

        {/* Confirmed Bookings with Calendar Integration */}
        {confirmedBookings.length > 0 && (
          <View style={styles.notificationsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Confirmed Sessions</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Add these sessions to your Google Calendar
            </Text>
            {confirmedBookings.map((booking) => (
              <BookingNotificationCard
                key={booking.id}
                booking={booking}
                userRole="client"
                onCalendarAdded={fetchBookings}
              />
            ))}
          </View>
        )}

        {/* All Bookings List */}
        <View style={styles.bookingsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>All Bookings</Text>
          
          {bookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Calendar color={colors.textSecondary} size={48} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No bookings yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Find a trainer and book your first session
              </Text>
            </View>
          ) : (
            <View style={styles.bookingsList}>
              {bookings.map((booking) => (
                <View key={booking.id}>
                  {renderBookingCard({ item: booking })}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
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
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingHeader: {
    marginBottom: 8,
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
    gap: 6,
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
    marginTop: 8,
    paddingTop: 8,
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
  calendarSection: {
    marginTop: 8,
  },
  calendarAdded: {
    padding: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarAddedText: {
    fontSize: 14,
  },
  calendarHint: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  notificationsSection: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft:20
  },
  sectionSubtitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  bookingsSection: {
    marginBottom: 20,
  },
});