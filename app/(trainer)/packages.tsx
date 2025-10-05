import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Alert, ScrollView, RefreshControl } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile } from '@/lib/supabase';
import NotificationService from '@/lib/notificationService';
import { Package, Plus, X, DollarSign, Calendar, Clock, Settings, User, CheckCircle, XCircle, AlertCircle, Send } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { CompactPackageCardSkeleton } from '@/components/SkeletonLoader';

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
  client?: {
    id: string;
    name: string;
    email: string;
  };
}

interface PublicPackage {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  session_count: number;
  duration_days: number;
  is_active: boolean;
  created_at: string;
}

export default function TrainerPackages() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();
  const [customPackages, setCustomPackages] = useState<CustomPackage[]>([]);
  const [publicPackages, setPublicPackages] = useState<PublicPackage[]>([]);
  const [clients, setClients] = useState<Profile[]>([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'public' | 'custom'>('custom');
  const [refreshing, setRefreshing] = useState(false);

  const styles = createStyles(colors);

  useEffect(() => {
    fetchCustomPackages();
    fetchPublicPackages();
    fetchClients();
  }, []);

  const fetchCustomPackages = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('custom_packages')
        .select(`
          *,
          client:profiles!custom_packages_client_id_fkey(id, name, email)
        `)
        .eq('trainer_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomPackages(data || []);
    } catch (error) {
      console.error('Error fetching custom packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicPackages = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('training_packages')
        .select('*')
        .eq('created_by', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPublicPackages(data || []);
    } catch (error) {
      console.error('Error fetching public packages:', error);
    }
  };

  const fetchClients = async () => {
    if (!userProfile) return;

    try {
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('client_trainer_relationships')
        .select(`
          client_id,
          client:profiles!client_trainer_relationships_client_id_fkey(*)
        `)
        .eq('trainer_id', userProfile.id)
        .eq('status', 'approved');

      if (relationshipsError) throw relationshipsError;

      const connectedClients = (relationshipsData?.map(r => r.client).filter(Boolean) || []) as unknown as Profile[];
      setClients(connectedClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleClientSelect = (client: Profile) => {
    setShowClientModal(false);
    router.push(`/(trainer)/client-profile?clientId=${client.id}`);
  };

  const handleCreatePublicPackage = () => {
    router.push('/(trainer)/create-package');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchCustomPackages(),
        fetchPublicPackages(),
        fetchClients()
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSendPackage = async (pkg: CustomPackage) => {
    Alert.alert(
      'Send Package',
      `Send "${pkg.name}" package to ${pkg.client?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              if (!userProfile) return;
              
              // Send notification to client
              const notificationService = NotificationService.getInstance();
              await notificationService.notifyCustomPackage(
                pkg.client_id,
                userProfile.name,
                pkg.name,
                pkg.id
              );
              
              Alert.alert('Success', 'Package sent successfully!');
            } catch (error) {
              console.error('Error sending package:', error);
              Alert.alert('Error', 'Failed to send package. Please try again.');
            }
          }
        }
      ]
    );
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
      case 'accepted': return <CheckCircle color="#FFFFFF" size={12} />;
      case 'pending': return <Clock color="#FFFFFF" size={12} />;
      case 'rejected': return <XCircle color="#FFFFFF" size={12} />;
      case 'expired': return <AlertCircle color="#FFFFFF" size={12} />;
      default: return <Clock color="#FFFFFF" size={12} />;
    }
  };

  const renderPackageCard = ({ item: pkg }: { item: CustomPackage }) => (
    <View style={[styles.packageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.packageHeader}>
        <View style={styles.packageInfo}>
          <Text style={[styles.packageName, { color: colors.text }]}>{pkg.name}</Text>
          <View style={styles.clientRow}>
            <User color={colors.textSecondary} size={12} />
            <Text style={[styles.clientName, { color: colors.textSecondary }]}>
              {pkg.client?.name}
            </Text>
          </View>
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
          <DollarSign color={colors.primary} size={16} />
          <Text style={[styles.packagePrice, { color: colors.primary }]}>${pkg.price}</Text>
        </View>

        <View style={styles.detailRow}>
          <Calendar color={colors.textSecondary} size={16} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {pkg.sessions_included} sessions
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Clock color={colors.textSecondary} size={16} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {pkg.validity_days} days
          </Text>
        </View>
      </View>

      <View style={styles.packageFooter}>
        <Text style={[styles.createdDate, { color: colors.textSecondary }]}>
          Created: {new Date(pkg.created_at).toLocaleDateString()}
        </Text>
        
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: colors.primary }]}
          onPress={() => handleSendPackage(pkg)}
        >
          <Send color="#FFFFFF" size={14} />
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPublicPackageCard = ({ item: pkg }: { item: PublicPackage }) => (
    <View style={[styles.packageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.packageHeader}>
        <View style={styles.packageInfo}>
          <Text style={[styles.packageName, { color: colors.text }]}>{pkg.name}</Text>
          <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.categoryText, { color: colors.primary }]}>{pkg.category}</Text>
          </View>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: pkg.is_active ? colors.success : colors.error }]}>
          <Text style={styles.statusText}>{pkg.is_active ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>

      {pkg.description && (
        <Text style={[styles.packageDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {pkg.description}
        </Text>
      )}

      <View style={styles.packageDetails}>
        <View style={styles.detailRow}>
          <DollarSign color={colors.primary} size={16} />
          <Text style={[styles.packagePrice, { color: colors.primary }]}>${pkg.price}</Text>
        </View>

        <View style={styles.detailRow}>
          <Calendar color={colors.textSecondary} size={16} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {pkg.session_count} sessions
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Clock color={colors.textSecondary} size={16} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {pkg.duration_days} days
          </Text>
        </View>
      </View>

      <Text style={[styles.createdDate, { color: colors.textSecondary }]}>
        Created: {new Date(pkg.created_at).toLocaleDateString()}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>My Packages</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {loading ? 'Loading...' : 
             activeTab === 'custom' ? `${customPackages.length} custom packages sent to clients` : 
             `${publicPackages.length} public packages available`}
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push('/(trainer)/package-management')}
          >
            <Settings color={colors.text} size={20} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={activeTab === 'custom' ? () => setShowClientModal(true) : handleCreatePublicPackage}
            disabled={loading || (activeTab === 'custom' && clients.length === 0)}
          >
            <Plus color="#FFFFFF" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            { borderBottomColor: activeTab === 'public' ? colors.primary : 'transparent' }
          ]}
          onPress={() => setActiveTab('public')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'public' ? colors.primary : colors.textSecondary }
          ]}>
            Public Packages ({publicPackages.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            { borderBottomColor: activeTab === 'custom' ? colors.primary : 'transparent' }
          ]}
          onPress={() => setActiveTab('custom')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'custom' ? colors.primary : colors.textSecondary }
          ]}>
            Custom Packages ({customPackages.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.packagesList}>
          <CompactPackageCardSkeleton />
          <CompactPackageCardSkeleton />
          <CompactPackageCardSkeleton />
          <CompactPackageCardSkeleton />
        </View>
      ) : activeTab === 'custom' ? (
        customPackages.length === 0 ? (
          <View style={styles.emptyState}>
            <Package color={colors.textSecondary} size={48} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No custom packages yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Create custom packages for your clients using the + button
            </Text>
          </View>
        ) : (
          <FlatList
            data={customPackages}
            renderItem={renderPackageCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.packagesList}
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
        publicPackages.length === 0 ? (
          <View style={styles.emptyState}>
            <Package color={colors.textSecondary} size={48} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No public packages yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Create public packages that clients can purchase directly
            </Text>
          </View>
        ) : (
          <FlatList
            data={publicPackages}
            renderItem={renderPublicPackageCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.packagesList}
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

      {/* Client Selection Modal */}
      <Modal
        visible={showClientModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowClientModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowClientModal(false)}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Client</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView 
            style={styles.modalContent}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              Select a client to view their profile:
            </Text>

            {clients.length === 0 ? (
              <View style={styles.emptyClientState}>
                <User color={colors.textSecondary} size={48} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No clients found</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Add clients first to create custom packages for them
                </Text>
              </View>
            ) : (
              clients.map((client) => (
                <TouchableOpacity
                  key={client.id}
                  style={[styles.clientCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleClientSelect(client)}
                >
                  <View style={[styles.clientAvatar, { backgroundColor: colors.primary }]}>
                    <User color="#FFFFFF" size={20} />
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={[styles.clientNameText, { color: colors.text }]}>{client.name}</Text>
                    <Text style={[styles.clientEmail, { color: colors.textSecondary }]}>{client.email}</Text>
                  </View>
                  <Plus color={colors.primary} size={20} />
                </TouchableOpacity>
              ))
            )}
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  manageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
  packagesList: {
    paddingHorizontal: 20,
  },
  packageCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  packageInfo: {
    flex: 1,
    marginRight: 16,
  },
  packageName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  packageActions: {
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  statusToggle: {
    fontSize: 12,
    fontWeight: '500',
  },
  packageDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  packageDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailText: {
    fontSize: 14,
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  modalDescription: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 24,
  },
  emptyClientState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientNameText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  clientEmail: {
    fontSize: 14,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  clientName: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  createdDate: {
    fontSize: 11,
    marginTop: 12,
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
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});