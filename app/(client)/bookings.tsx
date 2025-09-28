import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, RefreshControl, Modal, Alert } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Booking, Profile } from '@/lib/supabase';
import { googleCalendarService } from '@/lib/googleCalendar';
import { Calendar, Clock, User, MapPin, CalendarPlus, X, CheckCircle, AlertCircle, Info, ChevronRight } from 'lucide-react-native';
import { ClientBookingsSkeleton, DetailedBookingCardSkeleton, CompactBookingCardSkeleton } from '@/components/SkeletonLoader';
import BookingNotificationCard from '@/components/BookingNotificationCard';

export default function ClientBookings() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const [bookings, setBookings] = useState<(Booking & { trainer: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<(Booking & { trainer: Profile }) | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

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

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchBookings();
      await checkCalendarConnection();
    } catch (error) {
      console.error('Error refreshing bookings:', error);
    } finally {
      setRefreshing(false);
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

  const openBookingDetails = (booking: Booking & { trainer: Profile }) => {
    setSelectedBooking(booking);
    setModalVisible(true);
  };

  const closeBookingDetails = () => {
    setSelectedBooking(null);
    setModalVisible(false);
  };

  const addToGoogleCalendar = async (booking: Booking & { trainer: Profile }) => {
    if (!booking || booking.status !== 'confirmed') return;

    try {
      const eventTitle = `Training Session with ${booking.trainer.name}`;
      const eventDescription = `Training session: ${booking.duration_minutes} minutes\nTrainer: ${booking.trainer.name}\nLocation: TBD`;
      
      // Add booking to Google Calendar using the existing method
      const eventId = await googleCalendarService.addBookingToCalendar(booking, 'client');

      // Update booking to mark calendar as added
      const { error } = await supabase
        .from('bookings')
        .update({ calendar_added_by_client: true })
        .eq('id', booking.id);

      if (error) throw error;

      // Update local state
      setBookings(prev => prev.map(b => 
        b.id === booking.id 
          ? { ...b, calendar_added_by_client: true }
          : b
      ));

      Alert.alert('Success', 'Session added to Google Calendar!');
    } catch (error) {
      console.error('Error adding to calendar:', error);
      Alert.alert('Error', 'Failed to add to Google Calendar. Please try again.');
    }
  };

  const isBookingUpcoming = (booking: Booking & { trainer: Profile }) => {
    const bookingDateTime = new Date(`${booking.date}T${booking.end_time}`);
    const now = new Date();
    return bookingDateTime > now;
  };

  const renderBookingCard = ({ item: booking }: { item: Booking & { trainer: Profile } }) => (
    <TouchableOpacity 
      style={[styles.compactBookingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => openBookingDetails(booking)}
    >
      <View style={styles.compactCardContent}>
        <View style={styles.compactLeftContent}>
          <User color={colors.textSecondary} size={16} />
          <View style={styles.compactTextContent}>
            <Text style={[styles.compactTrainerName, { color: colors.text }]} numberOfLines={1}>
              {booking.trainer.name}
            </Text>
            <Text style={[styles.compactBookingTime, { color: colors.textSecondary }]}>
              {formatDate(booking.date)} • {formatTime(booking.start_time)}
            </Text>
          </View>
        </View>
        
        <View style={styles.compactRightContent}>
          <View style={[styles.compactStatusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
            <Text style={[styles.compactStatusText, { color: getStatusColor(booking.status) }]}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Text>
          </View>
          <ChevronRight color={colors.textSecondary} size={16} />
        </View>
      </View>
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

          {/* All Bookings List */}
          <View style={styles.bookingsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>All Bookings</Text>
            
            <View style={styles.bookingsList}>
              <CompactBookingCardSkeleton />
              <CompactBookingCardSkeleton />
              <CompactBookingCardSkeleton />
              <CompactBookingCardSkeleton />
              <CompactBookingCardSkeleton />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
            title="Pull to refresh bookings"
            titleColor={colors.textSecondary}
          />
        }
      >
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

      {/* Booking Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeBookingDetails}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={closeBookingDetails} style={styles.modalCloseButton}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Booking Details</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedBooking && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Booking Status */}
              <View style={[styles.modalSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.statusHeader}>
                  <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedBooking.status) + '20' }]}>
                    <Text style={[styles.modalStatusText, { color: getStatusColor(selectedBooking.status) }]}>
                      {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                    </Text>
                  </View>
                  {selectedBooking.status === 'confirmed' && (
                    <View style={styles.statusIcon}>
                      {selectedBooking.calendar_added_by_client ? (
                        <CheckCircle color={colors.success} size={20} />
                      ) : (
                        <AlertCircle color={colors.warning} size={20} />
                      )}
                    </View>
                  )}
                </View>
              </View>

              {/* Trainer Info */}
              <View style={[styles.modalSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Trainer</Text>
                <View style={styles.trainerSection}>
                  <User color={colors.primary} size={20} />
                  <View style={styles.trainerDetails}>
                    <Text style={[styles.trainerDetailName, { color: colors.text }]}>{selectedBooking.trainer.name}</Text>
                    {selectedBooking.trainer.bio && (
                      <Text style={[styles.trainerDetailBio, { color: colors.textSecondary }]}>
                        {selectedBooking.trainer.bio}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Session Details */}
              <View style={[styles.modalSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Session Details</Text>
                <View style={styles.detailItems}>
                  <View style={styles.detailItem}>
                    <Calendar color={colors.textSecondary} size={18} />
                    <Text style={[styles.detailItemText, { color: colors.text }]}>
                      {formatDate(selectedBooking.date)}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Clock color={colors.textSecondary} size={18} />
                    <Text style={[styles.detailItemText, { color: colors.text }]}>
                      {formatTime(selectedBooking.start_time)} - {formatTime(selectedBooking.end_time)}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Info color={colors.textSecondary} size={18} />
                    <Text style={[styles.detailItemText, { color: colors.text }]}>
                      {selectedBooking.duration_minutes} minutes
                    </Text>
                  </View>
                </View>
              </View>

              {/* Notes */}
              {selectedBooking.client_notes && (
                <View style={[styles.modalSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Your Notes</Text>
                  <Text style={[styles.notesContent, { color: colors.textSecondary }]}>
                    {selectedBooking.client_notes}
                  </Text>
                </View>
              )}

              {/* Google Calendar Integration */}
              {selectedBooking.status === 'confirmed' && isBookingUpcoming(selectedBooking) && (
                <View style={[styles.modalSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Google Calendar</Text>
                  {selectedBooking.calendar_added_by_client ? (
                    <View style={[styles.calendarSuccess, { backgroundColor: colors.success + '20' }]}>
                      <CheckCircle color={colors.success} size={18} />
                      <Text style={[styles.calendarSuccessText, { color: colors.success }]}>
                        Session added to your Google Calendar
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.calendarButton, { backgroundColor: colors.primary }]}
                      onPress={() => addToGoogleCalendar(selectedBooking)}
                    >
                      <CalendarPlus color="#FFFFFF" size={18} />
                      <Text style={styles.calendarButtonText}>
                        Add to Google Calendar
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Trainer Notes (if any) */}
              {selectedBooking.trainer_notes && (
                <View style={[styles.modalSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Trainer Notes</Text>
                  <Text style={[styles.notesContent, { color: colors.textSecondary }]}>
                    {selectedBooking.trainer_notes}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  bookingsList: {
    paddingHorizontal: 20,
  },
  compactBookingCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  compactTextContent: {
    flex: 1,
  },
  compactTrainerName: {
    fontSize: 14, // Reduced from 16
    fontWeight: '600',
    marginBottom: 2,
  },
  compactBookingTime: {
    fontSize: 12, // Reduced from 14
  },
  compactRightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  compactStatusText: {
    fontSize: 10, // Reduced from 12
    fontWeight: '500',
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
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18, // Reduced from 20
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalStatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalStatusText: {
    fontSize: 14, // Reduced from 16
    fontWeight: '600',
  },
  statusIcon: {
    padding: 4,
  },
  modalSectionTitle: {
    fontSize: 16, // Reduced from 18
    fontWeight: '600',
    marginBottom: 12,
  },
  trainerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trainerDetails: {
    flex: 1,
  },
  trainerDetailName: {
    fontSize: 16, // Reduced from 18
    fontWeight: '600',
    marginBottom: 4,
  },
  trainerDetailBio: {
    fontSize: 14, // Reduced from 16
  },
  detailItems: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailItemText: {
    fontSize: 14, // Reduced from 16
    flex: 1,
  },
  notesContent: {
    fontSize: 14, // Reduced from 16
    lineHeight: 20,
  },
  calendarSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  calendarSuccessText: {
    fontSize: 14, // Reduced from 16
    flex: 1,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  calendarButtonText: {
    color: '#FFFFFF',
    fontSize: 14, // Reduced from 16
    fontWeight: '600',
  },
});