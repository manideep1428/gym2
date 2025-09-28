import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl, Modal, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, PaymentRequest, Profile } from '@/lib/supabase';
import NotificationService from '@/lib/notificationService';
import { ClientPaymentsSkeleton } from '@/components/SkeletonLoader';
import { CreditCard, DollarSign, User, Calendar, CheckCircle, Clock, XCircle, X, Info, ChevronRight } from 'lucide-react-native';

export default function ClientPayments() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const [paymentRequests, setPaymentRequests] = useState<(PaymentRequest & { trainer: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<(PaymentRequest & { trainer: Profile }) | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const styles = createStyles(colors);

  useEffect(() => {
    fetchPaymentRequests();
  }, []);

  const fetchPaymentRequests = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('payment_requests')
        .select(`
          *,
          trainer:profiles!trainer_id(*)
        `)
        .eq('client_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentRequests(data || []);
    } catch (error) {
      console.error('Error fetching payment requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsPaid = async (paymentId: string, trainerId: string, trainerName: string, amount: number) => {
    try {
      const { error } = await supabase
        .from('payment_requests')
        .update({
          status: 'paid_by_user',
          paid_date: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (error) throw error;

      // Send notification to trainer
      await sendPaymentConfirmationNotification(trainerId, trainerName, amount);

      // Create in-app notification for trainer
      await supabase.from('notifications').insert({
        user_id: trainerId,
        title: 'Payment Received',
        message: `${userProfile?.name} marked payment of $${amount} as paid`,
        type: 'payment_confirmation'
      });

      Alert.alert('Success', 'Payment marked as paid! Waiting for trainer confirmation.');
      fetchPaymentRequests();
    } catch (error) {
      Alert.alert('Error', 'Failed to update payment status');
      console.error('Mark as paid error:', error);
    }
  };

  const sendPaymentConfirmationNotification = async (trainerId: string, trainerName: string, amount: number) => {
    try {
      const notificationService = NotificationService.getInstance();
      
      // Get trainer's push token
      const { data: trainerProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', trainerId)
        .single();

      if (trainerProfile?.push_token) {
        await notificationService.sendPushNotification(
          trainerProfile.push_token,
          'Payment Received',
          `${userProfile?.name} marked payment of $${amount} as paid`,
          {
            type: 'payment_confirmation' as any,
            clientId: userProfile?.id,
            clientName: userProfile?.name,
            amount: amount.toString()
          }
        );
      }
    } catch (error) {
      console.error('Error sending payment confirmation notification:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPaymentRequests();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle color={colors.success} size={20} />;
      case 'paid_by_user': return <Clock color={colors.warning} size={20} />;
      case 'pending': return <Clock color={colors.textSecondary} size={20} />;
      case 'rejected': return <XCircle color={colors.error} size={20} />;
      default: return <Clock color={colors.textSecondary} size={20} />;
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Confirmed';
      case 'paid_by_user': return 'Awaiting Confirmation';
      case 'pending': return 'Pending Payment';
      case 'rejected': return 'Rejected';
      default: return status.replace('_', ' ');
    }
  };

  const openPaymentDetails = (payment: PaymentRequest & { trainer: Profile }) => {
    setSelectedPayment(payment);
    setModalVisible(true);
  };

  const closePaymentDetails = () => {
    setSelectedPayment(null);
    setModalVisible(false);
  };

  const renderPaymentCard = ({ item: payment }: { item: PaymentRequest & { trainer: Profile } }) => (
    <TouchableOpacity 
      style={[styles.compactPaymentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => openPaymentDetails(payment)}
    >
      <View style={styles.compactCardContent}>
        <View style={styles.compactLeftContent}>
          <User color={colors.textSecondary} size={16} />
          <View style={styles.compactTextContent}>
            <Text style={[styles.compactTrainerName, { color: colors.text }]} numberOfLines={1}>
              {payment.trainer.name}
            </Text>
            <Text style={[styles.compactPaymentAmount, { color: colors.primary }]}>
              ${payment.amount}
            </Text>
          </View>
        </View>
        
        <View style={styles.compactRightContent}>
          <View style={[styles.compactStatusBadge, { backgroundColor: getStatusColor(payment.status) + '20' }]}>
            <Text style={[styles.compactStatusText, { color: getStatusColor(payment.status) }]}>
              {getStatusText(payment.status)}
            </Text>
          </View>
          <ChevronRight color={colors.textSecondary} size={16} />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <ClientPaymentsSkeleton />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>Payment Requests</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {paymentRequests.filter(p => p.status === 'pending').length} pending payments
          </Text>
        </View>
      </View>

      {paymentRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <CreditCard color={colors.textSecondary} size={48} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No payment requests</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Your trainers will send payment requests here
          </Text>
        </View>
      ) : (
        <FlatList
          data={paymentRequests}
          renderItem={renderPaymentCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.paymentsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closePaymentDetails}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={closePaymentDetails} style={styles.modalCloseButton}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Payment Details</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedPayment && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Payment Status */}
              <View style={[styles.modalSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.statusHeader}>
                  <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedPayment.status) + '20' }]}>
                    <Text style={[styles.modalStatusText, { color: getStatusColor(selectedPayment.status) }]}>
                      {getStatusText(selectedPayment.status)}
                    </Text>
                  </View>
                  {getStatusIcon(selectedPayment.status)}
                </View>
              </View>

              {/* Trainer Info */}
              <View style={[styles.modalSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Trainer</Text>
                <View style={styles.trainerSection}>
                  <User color={colors.primary} size={20} />
                  <View style={styles.trainerDetails}>
                    <Text style={[styles.trainerDetailName, { color: colors.text }]}>{selectedPayment.trainer.name}</Text>
                    {selectedPayment.trainer.bio && (
                      <Text style={[styles.trainerDetailBio, { color: colors.textSecondary }]}>
                        {selectedPayment.trainer.bio}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Payment Details */}
              <View style={[styles.modalSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Payment Details</Text>
                
                <View style={styles.amountSection}>
                  <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Amount</Text>
                  <Text style={[styles.amountValue, { color: colors.primary }]}>${selectedPayment.amount}</Text>
                </View>

                <View style={styles.detailItems}>
                  <View style={styles.detailItem}>
                    <Info color={colors.textSecondary} size={18} />
                    <Text style={[styles.detailItemText, { color: colors.text }]}>
                      {selectedPayment.description}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Calendar color={colors.textSecondary} size={18} />
                    <Text style={[styles.detailItemText, { color: colors.text }]}>
                      Due: {new Date(selectedPayment.due_date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {selectedPayment.created_at && (
                  <Text style={[styles.createdInfo, { color: colors.textSecondary }]}>
                    Requested: {new Date(selectedPayment.created_at).toLocaleDateString()}
                  </Text>
                )}
              </View>

              {/* Payment Actions */}
              {selectedPayment.status === 'pending' && (
                <View style={[styles.modalSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TouchableOpacity
                    style={[styles.payButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      closePaymentDetails();
                      markAsPaid(selectedPayment.id, selectedPayment.trainer_id, selectedPayment.trainer.name, selectedPayment.amount);
                    }}
                  >
                    <DollarSign color="#FFFFFF" size={20} />
                    <Text style={styles.payButtonText}>Mark as Paid</Text>
                  </TouchableOpacity>
                </View>
              )}

              {selectedPayment.status === 'paid_by_user' && (
                <View style={[styles.modalSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.waitingContainer, { backgroundColor: colors.warning + '20' }]}>
                    <Clock color={colors.warning} size={18} />
                    <Text style={[styles.waitingText, { color: colors.warning }]}>
                      Waiting for trainer confirmation
                    </Text>
                  </View>
                </View>
              )}

              {selectedPayment.status === 'approved' && (
                <View style={[styles.modalSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.approvedContainer, { backgroundColor: colors.success + '20' }]}>
                    <CheckCircle color={colors.success} size={18} />
                    <Text style={[styles.approvedText, { color: colors.success }]}>
                      Payment confirmed by trainer
                    </Text>
                  </View>
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
  },
  loadingText: {
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
  paymentsList: {
    paddingHorizontal: 20,
  },
  compactPaymentCard: {
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
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  compactPaymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
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
    fontSize: 10,
    fontWeight: '500',
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
    fontSize: 18,
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
    fontSize: 14,
    fontWeight: '600',
  },
  modalSectionTitle: {
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trainerDetailBio: {
    fontSize: 14,
  },
  amountSection: {
    marginBottom: 16,
  },
  amountLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: 'bold',
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
    fontSize: 14,
    flex: 1,
  },
  createdInfo: {
    fontSize: 12,
    marginTop: 8,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  waitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  waitingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  approvedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  approvedText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
