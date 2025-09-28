import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile } from '@/lib/supabase';
import { Users, Clock, CheckCircle, X, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface TrainerRequest {
  id: string;
  client_id: string;
  trainer_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'terminated';
  requested_at: string;
  client_message: string;
  trainer_response: string;
  client?: Profile;
}

export default function MyRequestsScreen() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState<TrainerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = createStyles(colors);

  useEffect(() => {
    fetchTrainerRequests();
  }, []);

  const fetchTrainerRequests = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_trainer_relationships')
        .select(`
          *,
          client:profiles!client_trainer_relationships_client_id_fkey(*)
        `)
        .eq('trainer_id', userProfile.id)
        .eq('requested_by', 'trainer')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching trainer requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTrainerRequests();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return colors.success;
      case 'pending': return colors.warning;
      case 'rejected': return colors.error;
      case 'terminated': return colors.textSecondary;
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle color="#FFFFFF" size={16} />;
      case 'pending': return <Clock color="#FFFFFF" size={16} />;
      case 'rejected': return <X color="#FFFFFF" size={16} />;
      case 'terminated': return <X color="#FFFFFF" size={16} />;
      default: return <Clock color="#FFFFFF" size={16} />;
    }
  };

  const renderRequestCard = ({ item: request }: { item: TrainerRequest }) => (
    <View style={[styles.requestCard, { backgroundColor: colors.card }]}>
      <View style={styles.requestHeader}>
        <View style={[styles.clientAvatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.clientInitial}>
            {request.client?.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.requestInfo}>
          <Text style={[styles.clientName, { color: colors.text }]}>
            {request.client?.name}
          </Text>
          <Text style={[styles.requestDate, { color: colors.textSecondary }]}>
            Sent: {new Date(request.requested_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(request.status) }
        ]}>
          {getStatusIcon(request.status)}
          <Text style={styles.statusText}>{request.status}</Text>
        </View>
      </View>

      <Text style={[styles.requestMessage, { color: colors.textSecondary }]}>
        You sent a request to add {request.client?.name} as your client.
      </Text>

      {request.trainer_response && (
        <View style={[styles.responseContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.responseLabel, { color: colors.textSecondary }]}>
            Client's response:
          </Text>
          <Text style={[styles.responseText, { color: colors.text }]}>
            {request.trainer_response}
          </Text>
        </View>
      )}
    </View>
  );

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>My Client Requests</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Track the status of requests you've sent to clients
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading requests...
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.requestsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Users color={colors.textSecondary} size={48} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No client requests
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Use the client search to find and add clients
              </Text>
            </View>
          }
          ListHeaderComponent={
            pendingRequests.length > 0 ? (
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Pending Approval ({pendingRequests.length})
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { fontSize: 16 },
  requestsList: { paddingHorizontal: 20 },
  sectionHeader: { marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  requestCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
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
  clientInitial: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  requestInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  requestDate: { fontSize: 12 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  requestMessage: { fontSize: 14, marginBottom: 12, lineHeight: 20 },
  responseContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  responseLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  responseText: { fontSize: 14 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
});
