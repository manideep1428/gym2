import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, SafeAreaView, Modal, ScrollView, TextInput } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile } from '@/lib/supabase';
import NotificationService from '@/lib/notificationService';
import { UserPlus, Users, CheckCircle, X, MessageSquare, ArrowLeft, User, Clock, Check } from 'lucide-react-native';
import { TrainerClientRequestsSkeleton } from '@/components/SkeletonLoader';
import { useRouter } from 'expo-router';

interface ClientRequest {
  id: string;
  client_id: string;
  trainer_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'terminated';
  requested_at: string;
  client_message: string;
  trainer_response: string;
  client?: Profile;
}

export default function ClientRequestsScreen() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ClientRequest | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  const styles = createStyles(colors);

  useEffect(() => {
    fetchClientRequests();
  }, []);

  const fetchClientRequests = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('client_trainer_relationships')
        .select(`
          *,
          client:profiles!client_trainer_relationships_client_id_fkey(*)
        `)
        .eq('trainer_id', userProfile.id)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching client requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestResponse = async (requestId: string, status: 'approved' | 'rejected', message: string = '') => {
    setProcessingRequest(requestId);
    
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
      if (selectedRequest && userProfile) {
        const notificationService = NotificationService.getInstance();
        await notificationService.notifyConnectionResponse(
          selectedRequest.client_id,
          userProfile.name,
          status,
          requestId,
          message
        );
      }

      // Refresh requests
      await fetchClientRequests();
      
      // Close modal
      setShowResponseModal(false);
      setSelectedRequest(null);
      setResponseMessage('');
      
      // Show success message
      alert(`Client request ${status} successfully!`);
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Failed to update request. Please try again.');
    } finally {
      setProcessingRequest(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'rejected': return '#EF4444';
      case 'terminated': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <Check color="#FFFFFF" size={16} />;
      case 'pending': return <Clock color="#FFFFFF" size={16} />;
      case 'rejected': return <X color="#FFFFFF" size={16} />;
      case 'terminated': return <X color="#FFFFFF" size={16} />;
      default: return <Clock color="#FFFFFF" size={16} />;
    }
  };

  const renderRequestCard = ({ item: request }: { item: ClientRequest }) => (
    <TouchableOpacity
      style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => {
        setSelectedRequest(request);
        if (request.status === 'pending') {
          setShowResponseModal(true);
        }
      }}
    >
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

        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
          {getStatusIcon(request.status)}
          <Text style={styles.statusText}>{request.status}</Text>
        </View>
      </View>

      {request.client_message && (
        <View style={[styles.messageContainer, { backgroundColor: colors.surface }]}>
          <MessageSquare color={colors.textSecondary} size={14} />
          <Text style={[styles.messageText, { color: colors.textSecondary }]} numberOfLines={2}>
            {request.client_message}
          </Text>
        </View>
      )}

      {request.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
            onPress={() => handleRequestResponse(request.id, 'approved')}
            disabled={processingRequest === request.id}
          >
            <Check color="#FFFFFF" size={16} />
            <Text style={styles.actionButtonText}>Accept</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
            onPress={() => {
              setSelectedRequest(request);
              setShowResponseModal(true);
            }}
            disabled={processingRequest === request.id}
          >
            <X color="#FFFFFF" size={16} />
            <Text style={styles.actionButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  if (loading) {
    return (
      <RNSafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <TrainerClientRequestsSkeleton />
      </RNSafeAreaView>
    );
  }

  return (
    <RNSafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Client Requests</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{pendingRequests.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>
            {requests.filter(r => r.status === 'approved').length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Approved</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: '#EF4444' }]}>
            {requests.filter(r => r.status === 'rejected').length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Declined</Text>
        </View>
      </View>

      {/* Requests List */}
      {requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Users color={colors.textSecondary} size={48} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No client requests</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Client requests will appear here when they want to become your dedicated clients
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.requestsList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Response Modal */}
      <Modal
        visible={showResponseModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowResponseModal(false)}
      >
        <RNSafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowResponseModal(false)}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Respond to Request</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedRequest && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.clientInfo}>
                <View style={[styles.modalAvatar, { backgroundColor: colors.primary }]}>
                  <User color="#FFFFFF" size={32} />
                </View>
                <Text style={[styles.modalClientName, { color: colors.text }]}>
                  {selectedRequest.client?.name}
                </Text>
                <Text style={[styles.modalClientEmail, { color: colors.textSecondary }]}>
                  {selectedRequest.client?.email}
                </Text>
              </View>

              {selectedRequest.client_message && (
                <View style={styles.messageSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Client Message</Text>
                  <View style={[styles.messageBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.messageContent, { color: colors.text }]}>
                      {selectedRequest.client_message}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.responseSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Response (Optional)</Text>
                <TextInput
                  style={[styles.responseInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Add a personal message..."
                  placeholderTextColor={colors.textSecondary}
                  value={responseMessage}
                  onChangeText={setResponseMessage}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: '#10B981' }]}
                  onPress={() => handleRequestResponse(selectedRequest.id, 'approved', responseMessage)}
                  disabled={processingRequest === selectedRequest.id}
                >
                  <Check color="#FFFFFF" size={20} />
                  <Text style={styles.modalActionButtonText}>
                    {processingRequest === selectedRequest.id ? 'Processing...' : 'Accept Client'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalActionButton, { backgroundColor: '#EF4444' }]}
                  onPress={() => handleRequestResponse(selectedRequest.id, 'rejected', responseMessage)}
                  disabled={processingRequest === selectedRequest.id}
                >
                  <X color="#FFFFFF" size={20} />
                  <Text style={styles.modalActionButtonText}>
                    {processingRequest === selectedRequest.id ? 'Processing...' : 'Decline Request'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </RNSafeAreaView>
      </Modal>
    </RNSafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  requestsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  requestCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  requestDate: {
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
    lineHeight: 24,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
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
  clientInfo: {
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
  },
  messageSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  messageBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  messageContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  responseSection: {
    marginBottom: 30,
  },
  responseInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
  },
  modalActions: {
    gap: 12,
    marginBottom: 40,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  modalActionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
