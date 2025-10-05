import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile } from '@/lib/supabase';
import { Users, User, Calendar, TrendingUp, ArrowRight, Plus, CheckCircle, XCircle, Clock } from 'lucide-react-native';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { useRouter } from 'expo-router';

interface TrainerRequest {
  id: string;
  trainer_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  trainer_message?: string;
  trainer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

export default function ClientTrainers() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();
  const [trainers, setTrainers] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<TrainerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'trainers' | 'requests'>('trainers');
  const [refreshing, setRefreshing] = useState(false);

  const styles = createStyles(colors);

  useEffect(() => {
    fetchTrainers();
    fetchRequests();
  }, []);

  const fetchTrainers = async () => {
    if (!userProfile) return;

    try {
      const { data: relationshipsData, error } = await supabase
        .from('client_trainer_relationships')
        .select(`
          trainer_id,
          trainer:profiles!client_trainer_relationships_trainer_id_fkey(*)
        `)
        .eq('client_id', userProfile.id)
        .eq('status', 'approved');

      if (error) throw error;

      const connectedTrainers = (relationshipsData?.map(r => r.trainer).filter(Boolean) || []) as unknown as Profile[];
      setTrainers(connectedTrainers);
    } catch (error) {
      console.error('Error fetching trainers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('client_trainer_relationships')
        .select(`
          *,
          trainer:profiles!client_trainer_relationships_trainer_id_fkey(id, name, email, phone)
        `)
        .eq('client_id', userProfile.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchTrainers(),
        fetchRequests()
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRequestResponse = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('client_trainer_relationships')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      Alert.alert('Success', `Request ${status} successfully!`);
      fetchRequests();
      fetchTrainers();
    } catch (error) {
      console.error('Error updating request:', error);
      Alert.alert('Error', 'Failed to update request. Please try again.');
    }
  };

  const renderTrainerCard = ({ item: trainer }: { item: Profile }) => (
    <View style={[styles.trainerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.trainerContent}
        onPress={() => router.push(`/(client)/trainer-profile?trainerId=${trainer.id}`)}
      >
        <View style={[styles.trainerAvatar, { backgroundColor: colors.primary }]}>
          <User color="#FFFFFF" size={24} />
        </View>
        
        <View style={styles.trainerInfo}>
          <View style={styles.trainerNameRow}>
            <Text style={[styles.trainerName, { color: colors.text }]}>
              {trainer.name}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: colors.success + '20' }]}>
              <Text style={[styles.statusText, { color: colors.success }]}>Connected</Text>
            </View>
          </View>
          
          <Text style={[styles.trainerEmail, { color: colors.textSecondary }]}>
            {trainer.email}
          </Text>
          
          {trainer.phone && (
            <Text style={[styles.trainerPhone, { color: colors.textSecondary }]}>
              {trainer.phone}
            </Text>
          )}
          
          <View style={styles.trainerMetrics}>
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

        <View style={styles.trainerActions}>
          <ArrowRight color={colors.textSecondary} size={16} />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderRequestCard = ({ item: request }: { item: TrainerRequest }) => (
    <View style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.requestHeader}>
        <View style={[styles.trainerAvatar, { backgroundColor: colors.primary }]}>
          <User color="#FFFFFF" size={20} />
        </View>
        
        <View style={styles.requestInfo}>
          <Text style={[styles.trainerName, { color: colors.text }]}>
            {request.trainer.name}
          </Text>
          <Text style={[styles.trainerEmail, { color: colors.textSecondary }]}>
            {request.trainer.email}
          </Text>
          {request.trainer_message && (
            <Text style={[styles.requestMessage, { color: colors.text }]}>
              "{request.trainer_message}"
            </Text>
          )}
          <Text style={[styles.requestDate, { color: colors.textSecondary }]}>
            {new Date(request.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.rejectButton, { backgroundColor: colors.error }]}
          onPress={() => handleRequestResponse(request.id, 'rejected')}
        >
          <XCircle color="#FFFFFF" size={16} />
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: colors.success }]}
          onPress={() => handleRequestResponse(request.id, 'approved')}
        >
          <CheckCircle color="#FFFFFF" size={16} />
          <Text style={styles.acceptButtonText}>Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>My Trainers</Text>
        </View>
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(client)/trainer-search')}
        >
          <Plus color="#FFFFFF" size={20} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            { borderBottomColor: activeTab === 'trainers' ? colors.primary : 'transparent' }
          ]}
          onPress={() => setActiveTab('trainers')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'trainers' ? colors.primary : colors.textSecondary }
          ]}>
            My Trainers ({trainers.length})
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
            Requests ({requests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.trainersList}>
          {Array.from({ length: 3 }).map((_, index) => (
            <View key={`trainer-skeleton-${index}`} style={[styles.trainerCard, { backgroundColor: colors.card }]}>
              <SkeletonLoader width={120} height={16} borderRadius={4} style={{ marginBottom: 8 }} />
              <SkeletonLoader width={180} height={14} borderRadius={4} />
            </View>
          ))}
        </View>
      ) : activeTab === 'trainers' ? (
        trainers.length === 0 ? (
          <View style={styles.emptyState}>
            <Users color={colors.textSecondary} size={48} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No trainers yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Use the + button to search and connect with trainers
            </Text>
          </View>
        ) : (
          <FlatList
            data={trainers}
            renderItem={renderTrainerCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.trainersList}
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
        )
      ) : (
        requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock color={colors.textSecondary} size={48} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No pending requests</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Trainer requests will appear here
            </Text>
          </View>
        ) : (
          <FlatList
            data={requests}
            renderItem={renderRequestCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.trainersList}
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
        )
      )}
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
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  trainersList: {
    paddingHorizontal: 20,
  },
  trainerCard: {
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
  trainerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  trainerAvatar: {
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
  trainerInfo: {
    flex: 1,
  },
  trainerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  trainerName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  trainerEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  trainerPhone: {
    fontSize: 14,
    marginBottom: 4,
  },
  trainerMetrics: {
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
  trainerActions: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 12,
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
  requestCard: {
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
  requestHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  requestInfo: {
    flex: 1,
  },
  requestMessage: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 12,
    marginTop: 4,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
