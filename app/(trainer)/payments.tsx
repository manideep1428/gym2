import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, PaymentRequest, Profile } from '@/lib/supabase';
import NotificationService from '@/lib/notificationService';
import { CreditCard, Plus, DollarSign, User, Calendar, X, Search, Heart, Send, AlertCircle } from 'lucide-react-native';
import { CompactPaymentCardSkeleton } from '@/components/SkeletonLoader';

export default function TrainerPayments() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const [paymentRequests, setPaymentRequests] = useState<(PaymentRequest & { client: Profile })[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [clients, setClients] = useState<Profile[]>([]);
  const [allClients, setAllClients] = useState<Profile[]>([]);
  const [connectedClients, setConnectedClients] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [newPayment, setNewPayment] = useState({
    amount: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(true);

  const styles = createStyles(colors);

  useEffect(() => {
    fetchPaymentRequests();
    fetchClients();
  }, []);

  const fetchPaymentRequests = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('payment_requests')
        .select(`
          *,
          client:profiles!client_id(*)
        `)
        .eq('trainer_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentRequests(data || []);
    } catch (error) {
      console.error('Error fetching payment requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    if (!userProfile) return;

    try {
      // Get all clients from the database for search functionality
      const { data: allClientsData, error: allClientsError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client')
        .order('name');

      if (allClientsError) throw allClientsError;
      setAllClients(allClientsData || []);

      // Get connected clients (approved relationships)
      const { data: connectedClientsData, error: connectedError } = await supabase
        .from('client_trainer_relationships')
        .select('client_id')
        .eq('trainer_id', userProfile.id)
        .eq('status', 'approved');

      if (connectedError) throw connectedError;

      const connectedClientIds = connectedClientsData?.map(rel => rel.client_id) || [];
      setConnectedClients(connectedClientIds);

      // Only show connected clients for payment requests
      if (connectedClientIds.length > 0) {
        const { data: clientsData, error: clientsError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', connectedClientIds)
          .eq('role', 'client')
          .order('name');

        if (clientsError) throw clientsError;
        
        // Add isConnected flag to clients
        const clientsWithFlags = (clientsData || []).map(client => ({
          ...client,
          isConnected: true
        }));
        
        setClients(clientsWithFlags);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const createPaymentRequest = async () => {
    if (!userProfile || !selectedClient) return;

    // Check if client is connected
    if (!connectedClients.includes(selectedClient)) {
      Alert.alert('Error', 'You can only send payment requests to connected clients. Please send a connection request first.');
      return;
    }

    if (!newPayment.amount || !newPayment.description) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const { data: paymentData, error } = await supabase
        .from('payment_requests')
        .insert({
          client_id: selectedClient,
          trainer_id: userProfile.id,
          amount: parseFloat(newPayment.amount),
          description: newPayment.description,
          due_date: newPayment.dueDate,
        })
        .select('*, client:profiles!client_id(*)')
        .single();

      if (error) throw error;

      // Send notification to client
      await sendPaymentNotification(paymentData);

      // Create in-app notification
      await supabase.from('notifications').insert({
        user_id: selectedClient,
        title: 'Payment Request',
        message: `${userProfile.name} sent you a payment request for $${newPayment.amount}`,
        type: 'payment_request'
      });

      Alert.alert('Success', 'Payment request sent to client!');
      setShowCreateModal(false);
      setNewPayment({ amount: '', description: '', dueDate: new Date().toISOString().split('T')[0] });
      setSelectedClient('');
      setClientSearchQuery('');
      fetchPaymentRequests();
    } catch (error) {
      Alert.alert('Error', 'Failed to create payment request');
      console.error('Create payment error:', error);
    }
  };


  const sendPaymentNotification = async (paymentData: any) => {
    try {
      const notificationService = NotificationService.getInstance();
      
      // Get client's push token
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', paymentData.client_id)
        .single();

      if (clientProfile?.push_token) {
        await notificationService.sendPushNotification(
          clientProfile.push_token,
          'Payment Request',
          `${userProfile?.name} sent you a payment request for $${paymentData.amount}`,
          {
            type: 'payment_request' as any,
            paymentId: paymentData.id,
            trainerId: userProfile?.id,
            trainerName: userProfile?.name,
            amount: paymentData.amount.toString()
          }
        );
      }
    } catch (error) {
      console.error('Error sending payment notification:', error);
    }
  };

  const approvePayment = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('payment_requests')
        .update({
          status: 'approved',
          approved_date: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (error) throw error;
      
      Alert.alert('Success', 'Payment approved!');
      fetchPaymentRequests();
    } catch (error) {
      Alert.alert('Error', 'Failed to approve payment');
      console.error('Approve payment error:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return colors.success;
      case 'paid_by_user': return colors.warning;
      case 'pending': return colors.textSecondary;
      case 'rejected': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const renderPaymentCard = ({ item: payment }: { item: PaymentRequest & { client: Profile } }) => (
    <View style={[styles.paymentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.paymentHeader}>
        <View style={styles.clientInfo}>
          <User color={colors.textSecondary} size={16} />
          <Text style={[styles.clientName, { color: colors.text }]}>{payment.client.name}</Text>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(payment.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(payment.status) }]}>
            {payment.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <Text style={[styles.paymentAmount, { color: colors.primary }]}>${payment.amount}</Text>
      <Text style={[styles.paymentDescription, { color: colors.textSecondary }]}>{payment.description}</Text>
      
      <View style={styles.paymentDetails}>
        <Text style={[styles.paymentDate, { color: colors.textSecondary }]}>
          Due: {new Date(payment.due_date).toLocaleDateString()}
        </Text>
      </View>

      {payment.status === 'paid_by_user' && (
        <TouchableOpacity
          style={[styles.approveButton, { backgroundColor: colors.success }]}
          onPress={() => approvePayment(payment.id)}
        >
          <Text style={styles.approveButtonText}>Approve Payment</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>Payment Requests</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {loading ? 'Loading...' : `${paymentRequests.filter(p => p.status === 'pending').length} pending requests`}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreateModal(true)}
          disabled={loading}
        >
          <Plus color="#FFFFFF" size={20} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.paymentsList}>
          <CompactPaymentCardSkeleton />
          <CompactPaymentCardSkeleton />
          <CompactPaymentCardSkeleton />
          <CompactPaymentCardSkeleton />
        </View>
      ) : paymentRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <CreditCard color={colors.textSecondary} size={48} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No payment requests</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Create payment requests for your clients
          </Text>
        </View>
      ) : (
        <FlatList
          data={paymentRequests}
          renderItem={renderPaymentCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.paymentsList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Payment Request Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Payment Request</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView 
            style={styles.modalContent}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Client</Text>
              
              <View style={styles.searchContainer}>
                <View style={[styles.searchInputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Search color={colors.textSecondary} size={20} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Search clients by name..."
                    placeholderTextColor={colors.textSecondary}
                    value={clientSearchQuery}
                    onChangeText={setClientSearchQuery}
                  />
                </View>
              </View>

              {clientSearchQuery ? (
                <View style={styles.clientSelectorContainer}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Search Results</Text>
                  <ScrollView 
                    style={styles.clientSelector}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                  >
                    {allClients
                      .filter(client => 
                        client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                        client.email.toLowerCase().includes(clientSearchQuery.toLowerCase())
                      )
                      .filter(client => connectedClients.includes(client.id))
                      .map((client) => (
                        <TouchableOpacity
                          key={client.id}
                          style={[
                            styles.clientOption,
                            { borderColor: colors.border, backgroundColor: colors.surface },
                            selectedClient === client.id && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                          ]}
                          onPress={() => {
                            setSelectedClient(client.id);
                            setClientSearchQuery('');
                          }}
                        >
                          <View style={styles.clientOptionContent}>
                            <View style={styles.clientOptionHeader}>
                              <Text style={[
                                styles.clientOptionText,
                                { color: selectedClient === client.id ? colors.primary : colors.text }
                              ]}>
                                {client.name}
                              </Text>
                              <View style={styles.connectedBadge}>
                                <Heart color="#E91E63" size={12} fill="#E91E63" />
                                <Text style={[styles.connectedText, { color: '#E91E63' }]}>Connected</Text>
                              </View>
                            </View>
                            <Text style={[
                              styles.clientOptionEmail,
                              { color: colors.textSecondary }
                            ]}>
                              {client.email}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    {allClients
                      .filter(client => 
                        client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
                        client.email.toLowerCase().includes(clientSearchQuery.toLowerCase())
                      )
                      .filter(client => connectedClients.includes(client.id)).length === 0 && (
                      <View style={styles.noResultsContainer}>
                        <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                          No connected clients found matching your search
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              ) : (
                <View style={styles.clientSelectorContainer}>
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Connected Clients</Text>
                  {clients.length === 0 ? (
                    <View style={[styles.errorContainer, { backgroundColor: colors.error + '10', borderColor: colors.error }]}>
                      <AlertCircle color={colors.error} size={24} />
                      <Text style={[styles.errorTitle, { color: colors.error }]}>No Connected Clients</Text>
                      <Text style={[styles.errorSubtitle, { color: colors.error }]}>
                        You can only send payment requests to clients who have connected with you. 
                        Ask your clients to send you connection requests from their app.
                      </Text>
                    </View>
                  ) : (
                    <ScrollView 
                      style={styles.clientSelector}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled={true}
                    >
                      {clients.map((client) => (
                        <TouchableOpacity
                          key={client.id}
                          style={[
                            styles.clientOption,
                            { borderColor: colors.border, backgroundColor: colors.surface },
                            selectedClient === client.id && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                          ]}
                          onPress={() => {
                            setSelectedClient(client.id);
                            setClientSearchQuery('');
                          }}
                        >
                          <View style={styles.clientOptionContent}>
                            <View style={styles.clientOptionHeader}>
                              <Text style={[
                                styles.clientOptionText,
                                { color: selectedClient === client.id ? colors.primary : colors.text }
                              ]}>
                                {client.name}
                              </Text>
                              <View style={styles.connectedBadge}>
                                <Heart color="#E91E63" size={12} fill="#E91E63" />
                                <Text style={[styles.connectedText, { color: '#E91E63' }]}>Connected</Text>
                              </View>
                            </View>
                            <Text style={[
                              styles.clientOptionEmail,
                              { color: colors.textSecondary }
                            ]}>
                              {client.email}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Amount</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                value={newPayment.amount}
                onChangeText={(text) => setNewPayment({ ...newPayment, amount: text })}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Description</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="What is this payment for?"
                placeholderTextColor={colors.textSecondary}
                value={newPayment.description}
                onChangeText={(text) => setNewPayment({ ...newPayment, description: text })}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton, 
                { backgroundColor: (!selectedClient || !newPayment.amount || !newPayment.description) ? colors.textSecondary : colors.primary }
              ]}
              onPress={createPaymentRequest}
              disabled={!selectedClient || !newPayment.amount || !newPayment.description}
            >
              <Send color="#FFFFFF" size={20} />
              <Text style={styles.submitButtonText}>Send Payment Request</Text>
            </TouchableOpacity>
          </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
  paymentsList: {
    paddingHorizontal: 20,
  },
  paymentCard: {
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
  paymentHeader: {
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
  paymentAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  paymentDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  paymentDetails: {
    marginBottom: 12,
  },
  paymentDate: {
    fontSize: 12,
  },
  approveButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
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
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clientSelectorContainer: {
    marginBottom: 16,
  },
  clientSelector: {
    gap: 8,
    maxHeight: 200,
    paddingBottom: 8,
  },
  clientOption: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  clientOptionContent: {
    gap: 4,
  },
  clientOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clientOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clientOptionEmail: {
    fontSize: 12,
  },
  dedicatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#E91E6320',
  },
  dedicatedText: {
    fontSize: 10,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  clientOptionWrapper: {
    marginBottom: 8,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E91E6320',
  },
  connectedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#E91E63',
  },
  noResultsContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyConnectedState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  emptyConnectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyConnectedSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});