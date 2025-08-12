import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile, Booking } from '@/lib/supabase';
import { Users, User, Calendar, TrendingUp, X } from 'lucide-react-native';

export default function TrainerClients() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const [clients, setClients] = useState<Profile[]>([]);
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null);
  const [clientBookings, setClientBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = createStyles(colors);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchClientBookings(selectedClient.id);
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    if (!userProfile) return;

    try {
      // Get unique clients from bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('client_id')
        .eq('trainer_id', userProfile.id);

      if (bookingsError) throw bookingsError;

      const uniqueClientIds = [...new Set(bookingsData?.map(b => b.client_id) || [])];

      if (uniqueClientIds.length > 0) {
        const { data: clientsData, error: clientsError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', uniqueClientIds)
          .eq('role', 'client');

        if (clientsError) throw clientsError;
        setClients(clientsData || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientBookings = async (clientId: string) => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('client_id', clientId)
        .eq('trainer_id', userProfile.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setClientBookings(data || []);
    } catch (error) {
      console.error('Error fetching client bookings:', error);
    }
  };

  const renderClientCard = ({ item: client }: { item: Profile }) => (
    <TouchableOpacity
      style={[styles.clientCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => setSelectedClient(client)}
    >
      <View style={[styles.clientAvatar, { backgroundColor: colors.primary }]}>
        <User color="#FFFFFF" size={20} />
      </View>
      
      <View style={styles.clientInfo}>
        <Text style={[styles.clientName, { color: colors.text }]}>{client.name}</Text>
        <Text style={[styles.clientEmail, { color: colors.textSecondary }]}>{client.email}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading clients...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>My Clients</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {clients.length} active clients
        </Text>
      </View>

      {clients.length === 0 ? (
        <View style={styles.emptyState}>
          <Users color={colors.textSecondary} size={48} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No clients yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Clients will appear here after they book sessions with you
          </Text>
        </View>
      ) : (
        <FlatList
          data={clients}
          renderItem={renderClientCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.clientsList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Client Details Modal */}
      <Modal
        visible={!!selectedClient}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedClient(null)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedClient(null)}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Client Details</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedClient && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.clientProfile}>
                <View style={[styles.modalAvatar, { backgroundColor: colors.primary }]}>
                  <User color="#FFFFFF" size={32} />
                </View>
                <Text style={[styles.modalClientName, { color: colors.text }]}>{selectedClient.name}</Text>
                <Text style={[styles.modalClientEmail, { color: colors.textSecondary }]}>{selectedClient.email}</Text>
                <Text style={[styles.modalClientPhone, { color: colors.textSecondary }]}>{selectedClient.phone}</Text>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Booking History</Text>
                {clientBookings.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
                    <Calendar color={colors.textSecondary} size={24} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No bookings yet</Text>
                  </View>
                ) : (
                  clientBookings.map((booking) => (
                    <View key={booking.id} style={[styles.bookingItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.bookingDetails}>
                        <Text style={[styles.bookingDate, { color: colors.text }]}>
                          {new Date(booking.date).toLocaleDateString()}
                        </Text>
                        <Text style={[styles.bookingTime, { color: colors.textSecondary }]}>
                          {booking.start_time} - {booking.end_time}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                          {booking.status}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setSelectedClient(null);
                  // Navigate to progress tracking for this client
                }}
              >
                <TrendingUp color="#FFFFFF" size={20} />
                <Text style={styles.actionButtonText}>View Progress</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'confirmed': return '#10B981';
    case 'pending': return '#F59E0B';
    case 'completed': return '#6B7280';
    case 'cancelled': return '#EF4444';
    default: return '#6B7280';
  }
};

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
  clientsList: {
    paddingHorizontal: 20,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  clientEmail: {
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  clientProfile: {
    alignItems: 'center',
    marginBottom: 30,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalClientName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalClientEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  modalClientPhone: {
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  bookingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  bookingDetails: {},
  bookingDate: {
    fontSize: 14,
    fontWeight: '500',
  },
  bookingTime: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});