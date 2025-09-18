import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Calendar, Users, DollarSign, TrendingUp, Clock, Package2, Edit, UserPlus } from 'lucide-react-native';
import { TrainerDashboardSkeleton } from '@/components/SkeletonLoader';

interface DashboardStats {
  totalBookings: number;
  todayBookings: number;
  totalClients: number;
  pendingPayments: number;
  monthlyRevenue: number;
  pendingClientRequests: number;
}

export default function TrainerDashboard() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    todayBookings: 0,
    totalClients: 0,
    pendingPayments: 0,
    monthlyRevenue: 0,
    pendingClientRequests: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = createStyles(colors);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    if (!userProfile) return;

    try {
      // Fetch bookings stats
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*, client:profiles!client_id(name)')
        .eq('trainer_id', userProfile.id);

      const today = new Date().toISOString().split('T')[0];
      const todayBookings = bookingsData?.filter(b => b.date === today) || [];

      // Fetch unique clients
      const uniqueClients = new Set(bookingsData?.map(b => b.client_id) || []);

      // Fetch pending payments
      const { data: paymentsData } = await supabase
        .from('payment_requests')
        .select('amount')
        .eq('trainer_id', userProfile.id)
        .eq('status', 'pending');

      const pendingAmount = paymentsData?.reduce((sum, p) => sum + p.amount, 0) || 0;

      // Fetch pending client requests
      const { data: clientRequestsData } = await supabase
        .from('client_trainer_relationships')
        .select('id')
        .eq('trainer_id', userProfile.id)
        .eq('status', 'pending');

      // Get recent bookings for display
      const recentBookings = bookingsData?.slice(0, 5) || [];

      setStats({
        totalBookings: bookingsData?.length || 0,
        todayBookings: todayBookings.length,
        totalClients: uniqueClients.size,
        pendingPayments: paymentsData?.length || 0,
        monthlyRevenue: 2840, // This would be calculated from actual payments
        pendingClientRequests: clientRequestsData?.length || 0,
      });

      setRecentBookings(recentBookings);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
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

  const StatCard = ({ icon, title, value, subtitle, color, onPress }: any) => (
    <TouchableOpacity 
      style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        {icon}
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.statSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <TrainerDashboardSkeleton />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.text }]}>
          Welcome back, {userProfile?.name}!
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Here's your training overview
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon={<Calendar color={colors.primary} size={24} />}
            title="Today's Sessions"
            value={stats.todayBookings}
            color={colors.primary}
            onPress={() => router.push('/(trainer)/bookings')}
          />
          <StatCard
            icon={<Users color={colors.success} size={24} />}
            title="Total Clients"
            value={stats.totalClients}
            color={colors.success}
            onPress={() => router.push('/(trainer)/clients')}
          />
          <StatCard
            icon={<TrendingUp color={colors.warning} size={24} />}
            title="Total Bookings"
            value={stats.totalBookings}
            color={colors.warning}
            onPress={() => router.push('/(trainer)/bookings')}
          />
          <StatCard
            icon={<DollarSign color={colors.error} size={24} />}
            title="Pending Payments"
            value={stats.pendingPayments}
            subtitle={`$${stats.monthlyRevenue}`}
            color={colors.error}
            onPress={() => router.push('/(trainer)/payments')}
          />
          <StatCard
            icon={<UserPlus color="#8B5CF6" size={24} />}
            title="Client Requests"
            value={stats.pendingClientRequests}
            color="#8B5CF6"
            onPress={() => router.push('/(trainer)/client-requests')}
          />
        </View>

        {/* Recent Bookings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Bookings</Text>

          {recentBookings.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Calendar color={colors.textSecondary} size={32} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No recent bookings</Text>
            </View>
          ) : (
            recentBookings.map((booking) => (
              <TouchableOpacity
                key={booking.id}
                style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push('/(trainer)/bookings')}
              >
                <View style={styles.bookingInfo}>
                  <Text style={[styles.clientName, { color: colors.text }]}>{booking.client.name}</Text>
                  <Text style={[styles.bookingDate, { color: colors.textSecondary }]}>
                    {formatDate(booking.date)} • {formatTime(booking.start_time)}
                  </Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>
                    {booking.status}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>

          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/(trainer)/availability')}
            >
              <Clock color={colors.primary} size={24} />
              <Text style={[styles.actionText, { color: colors.text }]}>Set Availability</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/(trainer)/packages')}
            >
              <Package2 color={colors.primary} size={24} />
              <Text style={[styles.actionText, { color: colors.text }]}>Create Package</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/(trainer)/payments')}
            >
              <DollarSign color={colors.primary} size={24} />
              <Text style={[styles.actionText, { color: colors.text }]}>Request Payment</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/(trainer)/clients')}
            >
              <Users color={colors.primary} size={24} />
              <Text style={[styles.actionText, { color: colors.text }]}>View Clients</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]} 
              onPress={() => router.push('/(trainer)/client-requests')}
            >
              <UserPlus color={colors.primary} size={24} />
              <Text style={[styles.actionText, { color: colors.text }]}>Client Requests</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/(trainer)/edit-profile')}
            >
              <Edit color={colors.primary} size={24} />
              <Text style={[styles.actionText, { color: colors.text }]}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
  greeting: {
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: 12,
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
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '30%',
    maxWidth: '48%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});