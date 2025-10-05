import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile, Booking, PaymentRequest } from '@/lib/supabase';
import NotificationService from '@/lib/notificationService';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign, 
  Package, 
  Bell,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react-native';
import { SkeletonLoader } from '@/components/SkeletonLoader';

interface CustomPackage {
  id: string;
  name: string;
  price: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  created_at: string;
}

export default function ClientProfile() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();
  const { clientId } = useLocalSearchParams();
  
  const [client, setClient] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [packages, setPackages] = useState<CustomPackage[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = createStyles(colors);

  useEffect(() => {
    if (clientId) {
      fetchClientData();
      fetchBookings();
      fetchPackages();
      fetchPaymentRequests();
    }
  }, [clientId]);

  const fetchClientData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      setClient(data);
    } catch (error) {
      console.error('Error fetching client:', error);
      Alert.alert('Error', 'Failed to load client data');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('client_id', clientId)
        .eq('trainer_id', userProfile.id)
        .order('date', { ascending: false })
        .limit(5);

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const fetchPackages = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('custom_packages')
        .select('id, name, price, status, created_at')
        .eq('client_id', clientId)
        .eq('trainer_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const fetchPaymentRequests = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('client_id', clientId)
        .eq('trainer_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentRequests(data || []);
    } catch (error) {
      console.error('Error fetching payment requests:', error);
    }
  };

  const handleCreatePackage = () => {
    router.push(`/(trainer)/create-package?clientId=${clientId}`);
  };

  const handlePaymentReminder = () => {
    // Check if there are any pending payment requests for this client
    const pendingPayments = paymentRequests.filter(pr => pr.status === 'pending');
    
    if (pendingPayments.length === 0) {
      Alert.alert(
        'No Payment Requests Found',
        `You need to create a payment request for ${client?.name} before sending a reminder. Would you like to create a payment request now?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create Payment Request',
            onPress: () => {
              router.push('/(trainer)/payments');
            }
          }
        ]
      );
      return;
    }

    Alert.alert(
      'Send Payment Reminder',
      `Send a payment reminder to ${client?.name} for ${pendingPayments.length} pending payment${pendingPayments.length > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reminder',
          onPress: async () => {
            try {
              // Send reminder notification for each pending payment
              const notificationService = NotificationService.getInstance();
              
              for (const payment of pendingPayments) {
                await notificationService.notifyPaymentRequest(
                  payment.client_id,
                  userProfile?.name || 'Trainer',
                  payment.amount,
                  payment.id
                );
              }
              
              Alert.alert('Success', 'Payment reminder sent successfully');
            } catch (error) {
              console.error('Error sending payment reminder:', error);
              Alert.alert('Error', 'Failed to send payment reminder. Please try again.');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return colors.success;
      case 'pending': return colors.warning;
      case 'completed': return colors.textSecondary;
      case 'cancelled': return colors.error;
      case 'accepted': return colors.success;
      case 'rejected': return colors.error;
      case 'expired': return colors.textSecondary;
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
      case 'confirmed':
      case 'completed':
        return <CheckCircle color="#FFFFFF" size={12} />;
      case 'rejected':
      case 'cancelled':
        return <XCircle color="#FFFFFF" size={12} />;
      default:
        return <Clock color="#FFFFFF" size={12} />;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Client Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <SkeletonLoader width={200} height={24} borderRadius={8} />
        </View>
      </View>
    );
  }

  if (!client) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Client Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>Client not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Client Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Client Info Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <User color="#FFFFFF" size={32} />
          </View>
          
          <Text style={[styles.clientName, { color: colors.text }]}>{client.name}</Text>
          
          <View style={styles.contactInfo}>
            <View style={styles.contactRow}>
              <Mail color={colors.textSecondary} size={16} />
              <Text style={[styles.contactText, { color: colors.textSecondary }]}>{client.email}</Text>
            </View>
            
            {client.phone && (
              <View style={styles.contactRow}>
                <Phone color={colors.textSecondary} size={16} />
                <Text style={[styles.contactText, { color: colors.textSecondary }]}>{client.phone}</Text>
              </View>
            )}
          </View>

          <View style={[styles.statusBadge, { backgroundColor: colors.success + '20' }]}>
            <Text style={[styles.statusText, { color: colors.success }]}>Active Client</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleCreatePackage}
          >
            <Package color="#FFFFFF" size={20} />
            <Text style={styles.actionButtonText}>Create Package</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.warning }]}
            onPress={handlePaymentReminder}
          >
            <Bell color="#FFFFFF" size={20} />
            <Text style={styles.actionButtonText}>Payment Reminder</Text>
          </TouchableOpacity>
        </View>

        {/* Custom Packages Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Custom Packages</Text>
            <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
              {packages.length}
            </Text>
          </View>

          {packages.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
              <Package color={colors.textSecondary} size={24} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No custom packages sent yet
              </Text>
            </View>
          ) : (
            packages.map((pkg) => (
              <View
                key={pkg.id}
                style={[styles.packageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.packageHeader}>
                  <View style={styles.packageInfo}>
                    <Text style={[styles.packageName, { color: colors.text }]}>{pkg.name}</Text>
                    <View style={styles.packageMeta}>
                      <DollarSign color={colors.primary} size={14} />
                      <Text style={[styles.packagePrice, { color: colors.primary }]}>${pkg.price}</Text>
                    </View>
                  </View>
                  
                  <View style={[styles.packageStatus, { backgroundColor: getStatusColor(pkg.status) }]}>
                    {getStatusIcon(pkg.status)}
                    <Text style={styles.packageStatusText}>{pkg.status}</Text>
                  </View>
                </View>
                
                <Text style={[styles.packageDate, { color: colors.textSecondary }]}>
                  Sent: {new Date(pkg.created_at).toLocaleDateString()}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Recent Bookings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Bookings</Text>
            <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
              {bookings.length}
            </Text>
          </View>

          {bookings.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
              <Calendar color={colors.textSecondary} size={24} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No bookings yet
              </Text>
            </View>
          ) : (
            bookings.map((booking) => (
              <View
                key={booking.id}
                style={[styles.bookingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.bookingInfo}>
                  <Text style={[styles.bookingDate, { color: colors.text }]}>
                    {new Date(booking.date).toLocaleDateString()}
                  </Text>
                  <Text style={[styles.bookingTime, { color: colors.textSecondary }]}>
                    {booking.start_time} - {booking.end_time}
                  </Text>
                </View>
                
                <View style={[styles.bookingStatus, { backgroundColor: getStatusColor(booking.status) }]}>
                  {getStatusIcon(booking.status)}
                  <Text style={styles.bookingStatusText}>{booking.status}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Progress Tracking */}
        <TouchableOpacity
          style={[styles.progressButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            // TODO: Navigate to progress tracking
            Alert.alert('Coming Soon', 'Progress tracking feature coming soon');
          }}
        >
          <TrendingUp color={colors.primary} size={20} />
          <Text style={[styles.progressButtonText, { color: colors.text }]}>View Progress & Stats</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
  },
  profileCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  clientName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  contactInfo: {
    width: '100%',
    gap: 8,
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  contactText: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  packageCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  packageInfo: {
    flex: 1,
    marginRight: 12,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  packageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  packagePrice: {
    fontSize: 14,
    fontWeight: '600',
  },
  packageStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  packageStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  packageDate: {
    fontSize: 11,
  },
  bookingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingDate: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  bookingTime: {
    fontSize: 13,
  },
  bookingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bookingStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  progressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 40,
  },
  progressButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
