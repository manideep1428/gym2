import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, PaymentRequest, Profile } from '@/lib/supabase';
import NotificationService from '@/lib/notificationService';
import { CreditCard, DollarSign, User, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react-native';

export default function ClientPayments() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const [paymentRequests, setPaymentRequests] = useState<(PaymentRequest & { trainer: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const renderPaymentCard = ({ item: payment }: { item: PaymentRequest & { trainer: Profile } }) => (
    <View style={[styles.paymentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.paymentHeader}>
        <View style={styles.trainerInfo}>
          <User color={colors.textSecondary} size={16} />
          <Text style={[styles.trainerName, { color: colors.text }]}>{payment.trainer.name}</Text>
        </View>
        
        <View style={styles.statusContainer}>
          {getStatusIcon(payment.status)}
          <Text style={[styles.statusText, { color: getStatusColor(payment.status) }]}>
            {getStatusText(payment.status)}
          </Text>
        </View>
      </View>

      <Text style={[styles.paymentAmount, { color: colors.primary }]}>${payment.amount}</Text>
      <Text style={[styles.paymentDescription, { color: colors.textSecondary }]}>{payment.description}</Text>
      
      <View style={styles.paymentDetails}>
        <View style={styles.dateContainer}>
          <Calendar color={colors.textSecondary} size={14} />
          <Text style={[styles.paymentDate, { color: colors.textSecondary }]}>
            Due: {new Date(payment.due_date).toLocaleDateString()}
          </Text>
        </View>
        
        {payment.created_at && (
          <Text style={[styles.createdDate, { color: colors.textSecondary }]}>
            Requested: {new Date(payment.created_at).toLocaleDateString()}
          </Text>
        )}
      </View>

      {payment.status === 'pending' && (
        <TouchableOpacity
          style={[styles.payButton, { backgroundColor: colors.primary }]}
          onPress={() => markAsPaid(payment.id, payment.trainer_id, payment.trainer.name, payment.amount)}
        >
          <DollarSign color="#FFFFFF" size={20} />
          <Text style={styles.payButtonText}>Mark as Paid</Text>
        </TouchableOpacity>
      )}

      {payment.status === 'paid_by_user' && (
        <View style={[styles.waitingContainer, { backgroundColor: colors.warning + '20' }]}>
          <Clock color={colors.warning} size={16} />
          <Text style={[styles.waitingText, { color: colors.warning }]}>
            Waiting for trainer confirmation
          </Text>
        </View>
      )}

      {payment.status === 'approved' && (
        <View style={[styles.approvedContainer, { backgroundColor: colors.success + '20' }]}>
          <CheckCircle color={colors.success} size={16} />
          <Text style={[styles.approvedText, { color: colors.success }]}>
            Payment confirmed by trainer
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading payments...</Text>
      </View>
    );
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
  trainerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trainerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    marginBottom: 12,
  },
  paymentDetails: {
    marginBottom: 12,
    gap: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentDate: {
    fontSize: 12,
  },
  createdDate: {
    fontSize: 12,
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
    fontSize: 14,
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
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '500',
  },
});
