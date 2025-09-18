import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { ContentLoadingOverlay, CardSkeleton, ListItemSkeleton, HeaderSkeleton } from '@/components/SkeletonLoader';
import { Search, Calendar, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase, Booking, Profile, PaymentRequest, TrainingPackage } from '@/lib/supabase';

export default function ClientHome() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();

  // Replace global loading with specific section loading states
  const [upcomingSessions, setUpcomingSessions] = useState<(Booking & { trainer: Profile })[]>([]);
  const [userPackages, setUserPackages] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<(PaymentRequest & { trainer: Profile })[]>([]);
  const [suggestedTrainers, setSuggestedTrainers] = useState<Profile[]>([]);

  // Individual loading states for each section
  const [upcomingSessionsLoading, setUpcomingSessionsLoading] = useState(false);
  const [userPackagesLoading, setUserPackagesLoading] = useState(false);
  const [pendingPaymentsLoading, setPendingPaymentsLoading] = useState(false);
  const [suggestedTrainersLoading, setSuggestedTrainersLoading] = useState(false);

  const fetchUpcomingSessions = async () => {
    if (!userProfile) return;

    setUpcomingSessionsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          trainer:profiles!trainer_id(*)
        `)
        .eq('client_id', userProfile.id)
        .eq('status', 'confirmed')
        .gte('date', today)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(5);

      if (error) throw error;
      setUpcomingSessions(data || []);
    } catch (error) {
      console.error('Error fetching upcoming sessions:', error);
    } finally {
      setUpcomingSessionsLoading(false);
    }
  };

  const fetchUserPackages = async () => {
    if (!userProfile) return;

    setUserPackagesLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_packages')
        .select(`
          *,
          package:training_packages(*)
        `)
        .eq('user_id', userProfile.id)
        .eq('is_active', true)
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      setUserPackages(data || []);
    } catch (error) {
      console.error('Error fetching user packages:', error);
    } finally {
      setUserPackagesLoading(false);
    }
  };

  const fetchPendingPayments = async () => {
    if (!userProfile) return;

    setPendingPaymentsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_requests')
        .select(`
          *,
          trainer:profiles!trainer_id(*)
        `)
        .eq('client_id', userProfile.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setPendingPayments(data || []);
    } catch (error) {
      console.error('Error fetching pending payments:', error);
    } finally {
      setPendingPaymentsLoading(false);
    }
  };

  const fetchSuggestedTrainers = async () => {
    setSuggestedTrainersLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'trainer')
        .order('rating', { ascending: false, nullsFirst: false })
        .limit(5);

      if (error) throw error;
      setSuggestedTrainers(data || []);
    } catch (error) {
      console.error('Error fetching suggested trainers:', error);
    } finally {
      setSuggestedTrainersLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [userProfile]);

  const fetchAllData = async () => {
    if (!userProfile) return;

    // Fetch all data in parallel without blocking the UI
    await Promise.all([
      fetchUpcomingSessions(),
      fetchUserPackages(),
      fetchPendingPayments(),
      fetchSuggestedTrainers(),
    ]);
  };

  const styles = createStyles(colors);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.text }]}>
            Hello {userProfile?.name}!
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Ready to achieve your fitness goals?
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={() => router.push('/(client)/trainer-search')}
        >
          <Search color={colors.primary} size={24} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Book Session Card - Always show */}
        <Pressable 
          style={({ pressed }) => [
            styles.bookSessionCard, 
            { backgroundColor: colors.primary },
            pressed && styles.cardPressed
          ]}
          onPress={() => router.push('/(client)/trainer-search')}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
        >
          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>
              <Calendar color="#FFFFFF" size={16} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Book a Session</Text>
              <Text style={styles.cardSubtitle}>Find and book with top trainers</Text>
            </View>
          </View>
        </Pressable>

        {/* Conditional Content */}
        <UpcomingSessionsSection
          sessions={upcomingSessions}
          colors={colors}
          router={router}
          isLoading={upcomingSessionsLoading}
        />
        <PackagesSection
          packages={userPackages}
          colors={colors}
          router={router}
          isLoading={userPackagesLoading}
        />
        <PendingPaymentsSection
          payments={pendingPayments}
          colors={colors}
          router={router}
          isLoading={pendingPaymentsLoading}
        />
        <SuggestedTrainersSection
          trainers={suggestedTrainers}
          colors={colors}
          router={router}
          isLoading={suggestedTrainersLoading}
        />
      </View>
    </View>
  );
}

// Section Components
const UpcomingSessionsSection = ({ sessions, colors, router, isLoading }: any) => {
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

  if (isLoading) {
    return (
      <View style={{ marginTop: 20 }}>
        <Text style={[createStyles(colors).sectionTitle, { color: colors.text }]}>Upcoming Sessions</Text>
        <View style={{ gap: 12 }}>
          <CardSkeleton height={80} />
          <CardSkeleton height={80} />
          <CardSkeleton height={80} />
        </View>
      </View>
    );
  }

  if (sessions.length === 0) return null;

  return (
    <View style={{ marginTop: 20 }}>
      <Text style={[createStyles(colors).sectionTitle, { color: colors.text }]}>Upcoming Sessions</Text>
      {sessions.slice(0, 3).map((session: any) => (
        <TouchableOpacity
          key={session.id}
          style={[createStyles(colors).sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/(client)/bookings')}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={[createStyles(colors).sessionTrainer, { color: colors.text }]}>
                {session.trainer.name}
              </Text>
              <Text style={[createStyles(colors).sessionDetails, { color: colors.textSecondary }]}>
                {formatDate(session.date)} at {formatTime(session.start_time)}
              </Text>
            </View>
            <View style={[createStyles(colors).statusBadge, { backgroundColor: colors.success + '20' }]}>
              <Text style={[createStyles(colors).statusText, { color: colors.success }]}>Confirmed</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
      {sessions.length > 3 && (
        <TouchableOpacity
          style={[createStyles(colors).viewAllButton, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/(client)/bookings')}
        >
          <Text style={[createStyles(colors).viewAllText, { color: colors.primary }]}>View All Sessions</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const PackagesSection = ({ packages, colors, router, isLoading }: any) => {
  if (isLoading) {
    return (
      <View style={{ marginTop: 20 }}>
        <Text style={[createStyles(colors).sectionTitle, { color: colors.text }]}>My Packages</Text>
        <View style={{ gap: 12 }}>
          <CardSkeleton height={80} />
          <CardSkeleton height={80} />
        </View>
      </View>
    );
  }

  if (packages.length === 0) return null;

  return (
    <View style={{ marginTop: 20 }}>
      <Text style={[createStyles(colors).sectionTitle, { color: colors.text }]}>My Packages</Text>
      {packages.slice(0, 3).map((userPackage: any) => (
        <TouchableOpacity
          key={userPackage.id}
          style={[createStyles(colors).packageCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/(client)/packages')}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={[createStyles(colors).packageName, { color: colors.text }]}>
                {userPackage.package.name}
              </Text>
              <Text style={[createStyles(colors).packageDetails, { color: colors.textSecondary }]}>
                {userPackage.sessions_remaining} sessions remaining
              </Text>
            </View>
            <View style={[createStyles(colors).sessionsBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[createStyles(colors).sessionsText, { color: colors.primary }]}>
                {userPackage.sessions_remaining}/{userPackage.sessions_completed + userPackage.sessions_remaining}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
      {packages.length > 3 && (
        <TouchableOpacity
          style={[createStyles(colors).viewAllButton, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/(client)/packages')}
        >
          <Text style={[createStyles(colors).viewAllText, { color: colors.primary }]}>View All Packages</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const PendingPaymentsSection = ({ payments, colors, router, isLoading }: any) => {
  if (isLoading) {
    return (
      <View style={{ marginTop: 20 }}>
        <Text style={[createStyles(colors).sectionTitle, { color: colors.text }]}>Pending Payments</Text>
        <View style={{ gap: 12 }}>
          <ListItemSkeleton hasAvatar={false} />
          <ListItemSkeleton hasAvatar={false} />
        </View>
      </View>
    );
  }

  if (payments.length === 0) return null;

  return (
    <View style={{ marginTop: 20 }}>
      <Text style={[createStyles(colors).sectionTitle, { color: colors.text }]}>Pending Payments</Text>
      {payments.slice(0, 3).map((payment: any) => (
        <TouchableOpacity
          key={payment.id}
          style={[createStyles(colors).paymentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/(client)/payments')}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={[createStyles(colors).paymentTrainer, { color: colors.text }]}>
                {payment.trainer.name}
              </Text>
              <Text style={[createStyles(colors).paymentDetails, { color: colors.textSecondary }]}>
                {payment.description}
              </Text>
              <Text style={[createStyles(colors).paymentAmount, { color: colors.primary }]}>
                ${payment.amount}
              </Text>
            </View>
            <View style={[createStyles(colors).statusBadge, { backgroundColor: colors.warning + '20' }]}>
              <Text style={[createStyles(colors).statusText, { color: colors.warning }]}>Pending</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
      {payments.length > 3 && (
        <TouchableOpacity
          style={[createStyles(colors).viewAllButton, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/(client)/payments')}
        >
          <Text style={[createStyles(colors).viewAllText, { color: colors.primary }]}>View All Payments</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const SuggestedTrainersSection = ({ trainers, colors, router, isLoading }: any) => {
  if (isLoading) {
    return (
      <View style={{ marginTop: 14 }}>
        <Text style={[createStyles(colors).sectionTitle, { color: colors.text }]}>Suggested Trainers</Text>
        <View style={{ gap: 12 }}>
          <CardSkeleton height={100} hasAvatar={true} />
          <CardSkeleton height={100} hasAvatar={true} />
          <CardSkeleton height={100} hasAvatar={true} />
        </View>
      </View>
    );
  }

  if (trainers.length === 0) return null;

  return (
    <View style={{ marginTop: 14 }}>
      <Text style={[createStyles(colors).sectionTitle, { color: colors.text }]}>Suggested Trainers</Text>
      {trainers.slice(0, 3).map((trainer: any) => (
        <TouchableOpacity
          key={trainer.id}
          style={[createStyles(colors).trainerCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/(client)/trainer-search')}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[createStyles(colors).trainerAvatar, { backgroundColor: colors.primary }]}>
              <Text style={[createStyles(colors).trainerInitial, { color: '#FFFFFF' }]}>
                {trainer.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[createStyles(colors).trainerName, { color: colors.text }]}>
                {trainer.name}
              </Text>
              <Text style={[createStyles(colors).trainerBio, { color: colors.textSecondary }]}>
                {trainer.bio || 'Professional trainer'}
              </Text>
              {trainer.rating && (
                <Text style={[createStyles(colors).trainerRating, { color: colors.textSecondary }]}>
                  ⭐ {trainer.rating} ({trainer.total_reviews || 0} reviews)
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[createStyles(colors).viewAllButton, { backgroundColor: colors.surface }]}
        onPress={() => router.push('/(client)/trainer-search')}
      >
        <Text style={[createStyles(colors).viewAllText, { color: colors.primary }]}>Find More Trainers</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bookSessionCard: {
    borderRadius: 12,
    padding: 18,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  quickActions: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    minHeight: 100,
    justifyContent: 'center',
  },
  actionCardPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sessionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sessionTrainer: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sessionDetails: {
    fontSize: 14,
  },
  packageCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  packageDetails: {
    fontSize: 14,
  },
  sessionsBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sessionsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  paymentCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  paymentTrainer: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  paymentDetails: {
    fontSize: 14,
    marginBottom: 4,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  trainerCard: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  trainerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainerInitial: {
    fontSize: 18,
    fontWeight: '600',
  },
  trainerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  trainerBio: {
    fontSize: 14,
    marginBottom: 4,
  },
  trainerRating: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  viewAllButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '500',
  },
});