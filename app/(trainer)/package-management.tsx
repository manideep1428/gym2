import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Package, User, DollarSign, Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface CustomPackage {
  id: string;
  client_id: string;
  name: string;
  description: string;
  price: number;
  sessions_included: number;
  validity_days: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  features: string[];
  created_at: string;
  expires_at: string;
  client?: {
    id: string;
    name: string;
    email: string;
  };
}

export default function PackageManagementScreen() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();

  const [packages, setPackages] = useState<CustomPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'all'>('pending');

  const styles = createStyles(colors);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('custom_packages')
        .select(`
          *,
          client:profiles!custom_packages_client_id_fkey(id, name, email)
        `)
        .eq('trainer_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      Alert.alert('Error', 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPackages();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return colors.success;
      case 'pending': return colors.warning;
      case 'rejected': return colors.error;
      case 'expired': return colors.textSecondary;
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle color="#FFFFFF" size={16} />;
      case 'pending': return <Clock color="#FFFFFF" size={16} />;
      case 'rejected': return <XCircle color="#FFFFFF" size={16} />;
      case 'expired': return <AlertCircle color="#FFFFFF" size={16} />;
      default: return <Clock color="#FFFFFF" size={16} />;
    }
  };

  const filteredPackages = packages.filter(pkg => {
    if (activeTab === 'all') return true;
    return pkg.status === activeTab;
  });

  const renderPackageCard = ({ item: pkg }: { item: CustomPackage }) => (
    <View style={[styles.packageCard, { backgroundColor: colors.card }]}>
      <View style={styles.packageHeader}>
        <View style={styles.packageInfo}>
          <Text style={[styles.packageName, { color: colors.text }]}>{pkg.name}</Text>
          <Text style={[styles.clientName, { color: colors.textSecondary }]}>
            For: {pkg.client?.name}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(pkg.status) }]}>
          {getStatusIcon(pkg.status)}
          <Text style={styles.statusText}>{pkg.status}</Text>
        </View>
      </View>

      {pkg.description && (
        <Text style={[styles.packageDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {pkg.description}
        </Text>
      )}

      <View style={styles.packageDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <DollarSign color={colors.primary} size={16} />
            <Text style={[styles.detailText, { color: colors.text }]}>${pkg.price}</Text>
          </View>
          <View style={styles.detailItem}>
            <User color={colors.primary} size={16} />
            <Text style={[styles.detailText, { color: colors.text }]}>{pkg.sessions_included} sessions</Text>
          </View>
          <View style={styles.detailItem}>
            <Calendar color={colors.primary} size={16} />
            <Text style={[styles.detailText, { color: colors.text }]}>{pkg.validity_days} days</Text>
          </View>
        </View>
      </View>

      {pkg.features && pkg.features.length > 0 && (
        <View style={styles.featuresContainer}>
          <Text style={[styles.featuresTitle, { color: colors.text }]}>Features:</Text>
          {pkg.features.slice(0, 2).map((feature, index) => (
            <Text key={index} style={[styles.featureText, { color: colors.textSecondary }]}>
              • {feature}
            </Text>
          ))}
          {pkg.features.length > 2 && (
            <Text style={[styles.moreFeatures, { color: colors.primary }]}>
              +{pkg.features.length - 2} more features
            </Text>
          )}
        </View>
      )}

      <View style={styles.packageFooter}>
        <Text style={[styles.createdDate, { color: colors.textSecondary }]}>
          Created: {new Date(pkg.created_at).toLocaleDateString()}
        </Text>
        {pkg.status === 'pending' && (
          <Text style={[styles.expiresDate, { color: colors.warning }]}>
            Expires: {new Date(pkg.expires_at).toLocaleDateString()}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Package Management</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: colors.warning }]}>
            {packages.filter(p => p.status === 'pending').length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: colors.success }]}>
            {packages.filter(p => p.status === 'accepted').length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Accepted</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statNumber, { color: colors.error }]}>
            {packages.filter(p => p.status === 'rejected').length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Rejected</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            { borderBottomColor: activeTab === 'pending' ? colors.primary : 'transparent' }
          ]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'pending' ? colors.primary : colors.textSecondary }
          ]}>
            Pending ({packages.filter(p => p.status === 'pending').length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            { borderBottomColor: activeTab === 'accepted' ? colors.primary : 'transparent' }
          ]}
          onPress={() => setActiveTab('accepted')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'accepted' ? colors.primary : colors.textSecondary }
          ]}>
            Accepted ({packages.filter(p => p.status === 'accepted').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            { borderBottomColor: activeTab === 'all' ? colors.primary : 'transparent' }
          ]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'all' ? colors.primary : colors.textSecondary }
          ]}>
            All ({packages.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Package List */}
      <FlatList
        data={filteredPackages}
        renderItem={renderPackageCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.packagesList}
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
            <Package color={colors.textSecondary} size={48} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {activeTab === 'pending' ? 'No pending packages' : 
               activeTab === 'accepted' ? 'No accepted packages' : 'No packages created'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {activeTab === 'all' ? 'Create custom packages for your clients' : 
               `No ${activeTab} packages found`}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: '600' },
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
  },
  statNumber: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { fontSize: 12, fontWeight: '500' },
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
  tabText: { fontSize: 14, fontWeight: '600' },
  packagesList: { paddingHorizontal: 20 },
  packageCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  packageInfo: { flex: 1 },
  packageName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  clientName: { fontSize: 14 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
  packageDescription: { fontSize: 14, marginBottom: 12, lineHeight: 20 },
  packageDetails: { marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 12, fontWeight: '500' },
  featuresContainer: { marginBottom: 12 },
  featuresTitle: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  featureText: { fontSize: 12, marginBottom: 2 },
  moreFeatures: { fontSize: 12, fontWeight: '500' },
  packageFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  createdDate: { fontSize: 11 },
  expiresDate: { fontSize: 11, fontWeight: '500' },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
});
