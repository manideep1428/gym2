import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Clock, User, ArrowRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface PendingRequest {
  id: string;
  trainer_id: string;
  status: string;
  requested_at: string;
  client_message?: string;
  trainer?: {
    name: string;
    specializations?: string[];
  };
}

export const PendingRequestsCard: React.FC = () => {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = createStyles(colors);

  useEffect(() => {
    if (userProfile) {
      fetchPendingRequests();
    }
  }, [userProfile]);

  const fetchPendingRequests = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('client_trainer_relationships')
        .select(`
          *,
          trainer:profiles!client_trainer_relationships_trainer_id_fkey(name, specializations)
        `)
        .eq('client_id', userProfile.id)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setPendingRequests(data || []);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const renderPendingRequest = ({ item }: { item: PendingRequest }) => (
    <View style={styles.requestItem}>
      <View style={styles.requestHeader}>
        <View style={[styles.trainerAvatar, { backgroundColor: colors.primary }]}>
          <User color="#FFFFFF" size={16} />
        </View>
        <View style={styles.requestInfo}>
          <Text style={[styles.trainerName, { color: colors.text }]}>
            {item.trainer?.name || 'Unknown Trainer'}
          </Text>
          <Text style={[styles.requestTime, { color: colors.textSecondary }]}>
            {getTimeAgo(item.requested_at)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: colors.warning + '20' }]}>
          <Clock color={colors.warning} size={12} />
        </View>
      </View>
      {item.client_message && (
        <Text style={[styles.requestMessage, { color: colors.textSecondary }]} numberOfLines={2}>
          "{item.client_message}"
        </Text>
      )}
    </View>
  );

  if (loading || pendingRequests.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Clock color={colors.warning} size={20} />
          <Text style={[styles.title, { color: colors.text }]}>Pending Requests</Text>
        </View>
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={() => router.push('/(client)/trainer-search')}
        >
          <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
          <ArrowRight color={colors.primary} size={16} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={pendingRequests.slice(0, 3)} // Show only first 3
        renderItem={renderPendingRequest}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
      />

      {pendingRequests.length > 3 && (
        <TouchableOpacity 
          style={styles.showMoreButton}
          onPress={() => router.push('/(client)/trainer-search')}
        >
          <Text style={[styles.showMoreText, { color: colors.primary }]}>
            +{pendingRequests.length - 3} more pending requests
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  requestItem: {
    paddingVertical: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trainerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  requestInfo: {
    flex: 1,
  },
  trainerName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  requestTime: {
    fontSize: 12,
  },
  statusBadge: {
    padding: 6,
    borderRadius: 12,
  },
  requestMessage: {
    fontSize: 14,
    fontStyle: 'italic',
    marginLeft: 44,
    lineHeight: 18,
  },
  separator: {
    height: 1,
    marginVertical: 8,
  },
  showMoreButton: {
    paddingTop: 12,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
