import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { supabase, Profile, Booking } from '@/lib/supabase';
import { Users, User, Calendar, TrendingUp, X, UserPlus, Trash2, AlertTriangle } from 'lucide-react-native';
import { NotificationBadge } from '@/components/NotificationBadge';
import { TrainerClientsSkeleton } from '@/components/SkeletonLoader';
import { useRouter } from 'expo-router';
import NotificationService from '@/lib/notificationService';

export default function TrainerClients() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const { notifications } = useNotifications();
  const router = useRouter();
  const [clients, setClients] = useState<Profile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null);
  const [clientBookings, setClientBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'clients' | 'requests'>('clients');
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [clientToRemove, setClientToRemove] = useState<any>(null);
  const [removeTimer, setRemoveTimer] = useState(5);
  const [canRemove, setCanRemove] = useState(false);

  // Count pending connection requests
  const pendingRequestsCount = pendingRequests.length;

  const styles = createStyles(colors);

  useEffect(() => {
    fetchClients();
    fetchPendingRequests();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchClientBookings(selectedClient.id);
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    if (!userProfile) return;

    try {
      // Get connected clients from relationships
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('client_trainer_relationships')
        .select(`
          client_id,
          client:profiles!client_trainer_relationships_client_id_fkey(*)
        `)
        .eq('trainer_id', userProfile.id)
        .eq('status', 'approved');

      if (relationshipsError) throw relationshipsError;

      const connectedClients = (relationshipsData?.map(r => r.client).filter(Boolean) || []) as unknown as Profile[];
      setClients(connectedClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('client_trainer_relationships')
        .select(`
          *,
          client:profiles!client_trainer_relationships_client_id_fkey(*)
        `)
        .eq('trainer_id', userProfile.id)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setPendingRequests(data || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
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

  const handleRequestResponse = async (requestId: string, status: 'approved' | 'rejected', message: string = '') => {
    try {
      const updateData: any = {
        status,
        trainer_response: message,
      };

      if (status === 'approved') {
        updateData.approved_at = new Date().toISOString();
      } else {
        updateData.rejected_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('client_trainer_relationships')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      // Send notification to client
      const request = pendingRequests.find(r => r.id === requestId);
      if (request && userProfile) {
        const notificationService = NotificationService.getInstance();
        await notificationService.notifyConnectionResponse(
          request.client_id,
          userProfile.name,
          status,
          requestId,
          message
        );
      }

      // Refresh data
      await fetchClients();
      await fetchPendingRequests();
      
      Alert.alert('Success', `Client request ${status} successfully!`);
    } catch (error) {
      console.error('Error updating request:', error);
      Alert.alert('Error', 'Failed to update request. Please try again.');
    }
  };

  const showRemoveConfirmation = (client: any, isRequest: boolean = false) => {
    setClientToRemove({ ...client, isRequest });
    setShowRemoveModal(true);
    setRemoveTimer(5);
    setCanRemove(false);
    
    // Start countdown
    const interval = setInterval(() => {
      setRemoveTimer(prev => {
        if (prev <= 1) {
          setCanRemove(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const removeClient = async () => {
    if (!clientToRemove || !canRemove) return;

    try {
      const { error } = await supabase
        .from('client_trainer_relationships')
        .update({ status: 'terminated', terminated_at: new Date().toISOString() })
        .eq('client_id', clientToRemove.id)
        .eq('trainer_id', userProfile?.id);

      if (error) throw error;

      // Refresh data
      await fetchClients();
      await fetchPendingRequests();
      
      setShowRemoveModal(false);
      setClientToRemove(null);
      Alert.alert('Success', 'Client relationship terminated successfully.');
    } catch (error) {
      console.error('Error removing client:', error);
      Alert.alert('Error', 'Failed to remove client. Please try again.');
    }
  };

  const renderClientCard = ({ item: client }: { item: Profile }) => (
    <View style={[styles.clientCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.clientContent}
        onPress={() => setSelectedClient(client)}
      >
        <View style={[styles.clientAvatar, { backgroundColor: colors.primary }]}>
          <User color="#FFFFFF" size={20} />
        </View>
        
        <View style={styles.clientInfo}>
          <Text style={[styles.clientName, { color: colors.text }]}>
            {client.name}
          </Text>
          <Text style={[styles.clientEmail, { color: colors.textSecondary }]}>
            {client.email}
          </Text>
        </View>

        <View style={styles.clientStats}>
          <Text style={[styles.statsText, { color: colors.textSecondary }]}>
            View Details
          </Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.removeButton, { backgroundColor: colors.error + '10' }]}
        onPress={() => showRemoveConfirmation(client)}
      >
        <Trash2 color={colors.error} size={16} />
      </TouchableOpacity>
    </View>
  );

  const renderRequestCard = ({ item: request }: { item: any }) => (
    <View style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.requestHeader}>
        <View style={[styles.clientAvatar, { backgroundColor: colors.primary }]}>
          <User color="#FFFFFF" size={20} />
        </View>
        
        <View style={styles.requestInfo}>
          <Text style={[styles.clientName, { color: colors.text }]}>
            {request.client?.name || 'Unknown Client'}
          </Text>
          <Text style={[styles.requestDate, { color: colors.textSecondary }]}>
            {new Date(request.requested_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      {request.client_message && (
        <Text style={[styles.requestMessage, { color: colors.textSecondary }]}>
          "{request.client_message}"
        </Text>
      )}

      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.approveButton, { backgroundColor: colors.success }]}
          onPress={() => handleRequestResponse(request.id, 'approved')}
        >
          <Text style={styles.actionButtonText}>Approve</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.rejectButton, { backgroundColor: colors.error }]}
          onPress={() => handleRequestResponse(request.id, 'rejected')}
        >
          <Text style={styles.actionButtonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return <TrainerClientsSkeleton />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Clients & Requests</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            { borderBottomColor: activeTab === 'clients' ? colors.primary : 'transparent' }
          ]}
          onPress={() => setActiveTab('clients')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'clients' ? colors.primary : colors.textSecondary }
          ]}>
            Current Clients ({clients.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            { borderBottomColor: activeTab === 'requests' ? colors.primary : 'transparent' }
          ]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'requests' ? colors.primary : colors.textSecondary }
          ]}>
            Requests ({pendingRequestsCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'clients' ? (
        clients.length === 0 ? (
          <View style={styles.emptyState}>
            <Users color={colors.textSecondary} size={48} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No clients yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Approved client relationships will appear here
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
        )
      ) : (
        pendingRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <UserPlus color={colors.textSecondary} size={48} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No pending requests</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Client connection requests will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={pendingRequests}
            renderItem={renderRequestCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.clientsList}
            showsVerticalScrollIndicator={false}
          />
        )
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

      {/* Remove Confirmation Modal */}
      <Modal
        visible={showRemoveModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRemoveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.removeModalContainer, { backgroundColor: colors.card }]}>
            <View style={styles.removeModalHeader}>
              <AlertTriangle color={colors.error} size={24} />
              <Text style={[styles.removeModalTitle, { color: colors.text }]}>
                Remove Client
              </Text>
            </View>
            
            <Text style={[styles.removeModalMessage, { color: colors.textSecondary }]}>
              Are you sure you want to remove {clientToRemove?.name}? This will terminate your relationship and cannot be undone.
            </Text>
            
            <View style={styles.removeModalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.surface }]}
                onPress={() => setShowRemoveModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.confirmRemoveButton,
                  { 
                    backgroundColor: canRemove ? colors.error : colors.error + '50',
                    opacity: canRemove ? 1 : 0.5
                  }
                ]}
                onPress={removeClient}
                disabled={!canRemove}
              >
                <Text style={styles.confirmRemoveButtonText}>
                  {canRemove ? 'Remove' : `Wait ${removeTimer}s`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderBottomWidth: 2,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerContent: {
    flex: 1,
  },
  requestsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  clientContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientStats: {
    alignItems: 'flex-end',
  },
  statsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  removeButton: {
    padding: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  requestCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
    marginLeft: 12,
  },
  requestDate: {
    fontSize: 12,
    marginTop: 2,
  },
  requestMessage: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 16,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  approveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
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
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeModalContainer: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '90%',
  },
  removeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  removeModalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  removeModalMessage: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  removeModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmRemoveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmRemoveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});