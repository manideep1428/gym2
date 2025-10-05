import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, Alert, RefreshControl } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile, Booking } from '@/lib/supabase';
import { Users, User, Calendar, TrendingUp, X, Trash2, AlertTriangle, ArrowRight, Plus } from 'lucide-react-native';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { useRouter } from 'expo-router';

export default function TrainerClients() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Profile[]>([]);
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null);
  const [clientBookings, setClientBookings] = useState<Booking[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [clientToRemove, setClientToRemove] = useState<any>(null);
  const [removeTimer, setRemoveTimer] = useState(5);
  const [canRemove, setCanRemove] = useState(false);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [expandedRemoveTimer, setExpandedRemoveTimer] = useState(5);
  const [expandedCanRemove, setExpandedCanRemove] = useState(false);
  const [refreshing, setRefreshing] = useState(false);


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

    setClientsLoading(true);
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
      setClientsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchClients();
    } finally {
      setRefreshing(false);
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

  const toggleRemoveExpansion = (clientId: string) => {
    if (expandedClientId === clientId) {
      setExpandedClientId(null);
      setExpandedCanRemove(false);
      setExpandedRemoveTimer(5);
    } else {
      setExpandedClientId(clientId);
      setExpandedRemoveTimer(5);
      setExpandedCanRemove(false);
      
      // Start countdown for expanded remove
      const interval = setInterval(() => {
        setExpandedRemoveTimer(prev => {
          if (prev <= 1) {
            setExpandedCanRemove(true);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const removeClientExpanded = async (client: Profile) => {
    if (!expandedCanRemove) return;

    try {
      const { error } = await supabase
        .from('client_trainer_relationships')
        .update({ status: 'terminated', terminated_at: new Date().toISOString() })
        .eq('client_id', client.id)
        .eq('trainer_id', userProfile?.id);

      if (error) throw error;

      // Refresh data
      await fetchClients();
      
      setExpandedClientId(null);
      Alert.alert('Success', 'Client relationship terminated successfully.');
    } catch (error) {
      console.error('Error removing client:', error);
      Alert.alert('Error', 'Failed to remove client. Please try again.');
    }
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
      
      setShowRemoveModal(false);
      setClientToRemove(null);
      Alert.alert('Success', 'Client relationship terminated successfully.');
    } catch (error) {
      console.error('Error removing client:', error);
      Alert.alert('Error', 'Failed to remove client. Please try again.');
    }
  };

  const renderClientCard = ({ item: client }: { item: Profile }) => {
    const isExpanded = expandedClientId === client.id;
    
    return (
      <View style={[styles.clientCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Main Client Info Row */}
        <View style={styles.clientMainRow}>
          <TouchableOpacity
            style={styles.clientContent}
            onPress={() => router.push(`/(trainer)/client-profile?clientId=${client.id}`)}
          >
            <View style={[styles.clientAvatar, { backgroundColor: colors.primary }]}>
              <User color="#FFFFFF" size={24} />
            </View>
            
            <View style={styles.clientInfo}>
              <View style={styles.clientNameRow}>
                <Text style={[styles.clientName, { color: colors.text }]}>
                  {client.name}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: colors.success + '20' }]}>
                  <Text style={[styles.statusText, { color: colors.success }]}>Active</Text>
                </View>
              </View>
              
              <Text style={[styles.clientEmail, { color: colors.textSecondary }]}>
                {client.email}
              </Text>
              
              {client.phone && (
                <Text style={[styles.clientPhone, { color: colors.textSecondary }]}>
                  {client.phone}
                </Text>
              )}
              
              <View style={styles.clientMetrics}>
                <View style={styles.metricItem}>
                  <Calendar color={colors.primary} size={14} />
                  <Text style={[styles.metricText, { color: colors.textSecondary }]}>Sessions: 0</Text>
                </View>
                <View style={styles.metricItem}>
                  <TrendingUp color={colors.primary} size={14} />
                  <Text style={[styles.metricText, { color: colors.textSecondary }]}>Progress: Good</Text>
                </View>
              </View>
            </View>

            <View style={styles.clientActions}>
              <View style={styles.actionIcon}>
                <ArrowRight color={colors.textSecondary} size={16} />
              </View>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.expandRemoveButton, { backgroundColor: isExpanded ? colors.error + '20' : colors.surface }]}
            onPress={() => toggleRemoveExpansion(client.id)}
          >
            <Trash2 color={isExpanded ? colors.error : colors.textSecondary} size={18} />
          </TouchableOpacity>
        </View>
        
        {isExpanded && (
          <View style={[styles.removeExpansion, { backgroundColor: colors.error + '05', borderColor: colors.error + '20' }]}>
            <View style={styles.removeWarning}>
              <AlertTriangle color={colors.error} size={20} />
              <Text style={[styles.removeWarningText, { color: colors.text }]}>
                Remove {client.name}?
              </Text>
            </View>
            
            <Text style={[styles.removeDescription, { color: colors.textSecondary }]}>
              This will terminate your relationship and cannot be undone.
            </Text>
            
            <View style={styles.removeActions}>
              <TouchableOpacity
                style={[styles.cancelRemoveButton, { backgroundColor: colors.surface }]}
                onPress={() => setExpandedClientId(null)}
              >
                <Text style={[styles.cancelRemoveText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.confirmExpandedRemoveButton,
                  { 
                    backgroundColor: expandedCanRemove ? colors.error : colors.error + '50',
                    opacity: expandedCanRemove ? 1 : 0.6
                  }
                ]}
                onPress={() => removeClientExpanded(client)}
                disabled={!expandedCanRemove}
              >
                <Text style={styles.confirmExpandedRemoveText}>
                  {expandedCanRemove ? 'Remove' : `Wait ${expandedRemoveTimer}s`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>Clients</Text>
        </View>
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(trainer)/client-search')}
        >
          <Plus color="#FFFFFF" size={20} />
        </TouchableOpacity>
      </View>


      {/* Content */}
      {clientsLoading ? (
        <View style={styles.clientsList}>
          {Array.from({ length: 3 }).map((_, index) => (
            <View key={`client-skeleton-${index}`} style={[styles.clientCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.clientAvatar, { backgroundColor: colors.primary }]}>
                {/* Skeleton avatar */}
              </View>
              <View style={styles.clientInfo}>
                <SkeletonLoader width={120} height={16} borderRadius={4} style={{ marginBottom: 4 }} />
                <SkeletonLoader width={180} height={14} borderRadius={4} />
              </View>
              <View style={styles.clientStats}>
                <SkeletonLoader width={80} height={12} borderRadius={4} />
              </View>
              <View style={[styles.expandRemoveButton, { backgroundColor: colors.error + '10' }]}>
                {/* Skeleton remove button */}
              </View>
            </View>
          ))}
        </View>
      ) : clients.length === 0 ? (
        <View style={styles.emptyState}>
          <Users color={colors.textSecondary} size={48} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No clients yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Use the + button to search and add clients
          </Text>
        </View>
      ) : (
        <FlatList
          data={clients}
          renderItem={renderClientCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.clientsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerContent: {
    flex: 1,
  },
  searchButton: {
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
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  clientMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  clientContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  clientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  clientMetrics: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 16,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '500',
  },
  clientActions: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 12,
  },
  actionIcon: {
    padding: 8,
  },
  expandRemoveButton: {
    padding: 12,
    borderRadius: 12,
    marginLeft: 16,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  removeExpansion: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: -4,
  },
  removeWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  removeWarningText: {
    fontSize: 16,
    fontWeight: '600',
  },
  removeDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  removeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelRemoveButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelRemoveText: {
    fontSize: 14,
    fontWeight: '500',
  },
  confirmExpandedRemoveButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmExpandedRemoveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  clientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  clientInfo: {
    flex: 1,
  },
  clientStats: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  clientName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  clientEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  clientPhone: {
    fontSize: 14,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
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
    fontWeight: '700',
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