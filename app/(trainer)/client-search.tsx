import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile } from '@/lib/supabase';
import NotificationService from '@/lib/notificationService';
import { Search, Filter, User, ArrowLeft, UserPlus, Heart, Package, Plus, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function ClientSearchScreen() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Profile[]>([]);
  const [filteredClients, setFilteredClients] = useState<Profile[]>([]);
  const [trainerRelationships, setTrainerRelationships] = useState<any[]>([]);
  const [requestingClient, setRequestingClient] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null);

  const styles = createStyles(colors);

  useEffect(() => {
    fetchClients();
    fetchTrainerRelationships();
  }, []);

  useEffect(() => {
    applySearch();
  }, [searchQuery, clients]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client')
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainerRelationships = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('client_trainer_relationships')
        .select('*')
        .eq('trainer_id', userProfile.id);

      if (error) throw error;
      setTrainerRelationships(data || []);
    } catch (error) {
      console.error('Error fetching trainer relationships:', error);
    }
  };

  const requestClientRelationship = async (clientId: string) => {
    if (!userProfile) return;
    
    setRequestingClient(clientId);
    
    try {
      const { data, error } = await supabase
        .from('client_trainer_relationships')
        .insert({
          client_id: clientId,
          trainer_id: userProfile.id,
          requested_by: 'trainer',
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification to client
      const notificationService = NotificationService.getInstance();
      await notificationService.notifyConnectionRequest(
        clientId,
        userProfile.name,
        data.id,
        'I would like to add you as my client'
      );
      
      await fetchTrainerRelationships();
      Alert.alert('Success', 'Client request sent successfully!');
    } catch (error) {
      console.error('Error requesting client relationship:', error);
      Alert.alert('Error', 'Failed to send request. Please try again.');
    } finally {
      setRequestingClient(null);
    }
  };

  const getRelationshipStatus = (clientId: string) => {
    const relationship = trainerRelationships.find(rel => rel.client_id === clientId);
    if (relationship?.status === 'terminated') return null;
    return relationship?.status || null;
  };

  const applySearch = () => {
    let filtered = clients;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(query) ||
        client.email?.toLowerCase().includes(query)
      );
    }

    setFilteredClients(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchClients(),
        fetchTrainerRelationships()
      ]);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const renderRelationshipButton = (client: Profile) => {
    const relationshipStatus = getRelationshipStatus(client.id);
    const isRequesting = requestingClient === client.id;
    
    if (relationshipStatus === 'approved') {
      return (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.relationshipButton, { backgroundColor: colors.success }]}
            disabled
          >
            <Heart color="#FFFFFF" size={14} fill="#FFFFFF" />
            <Text style={styles.relationshipButtonText}>My Client</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.packageButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              setSelectedClient(client);
              setShowPackageModal(true);
            }}
          >
            <Package color="#FFFFFF" size={14} />
          </TouchableOpacity>
        </View>
      );
    }
    
    if (relationshipStatus === 'pending') {
      return (
        <TouchableOpacity
          style={[styles.relationshipButton, { backgroundColor: colors.warning }]}
          disabled
        >
          <UserPlus color="#FFFFFF" size={14} />
          <Text style={styles.relationshipButtonText}>Pending</Text>
        </TouchableOpacity>
      );
    }
    
    if (relationshipStatus === 'rejected') {
      return (
        <TouchableOpacity
          style={[styles.relationshipButton, { backgroundColor: colors.error }]}
          disabled
        >
          <X color="#FFFFFF" size={14} />
          <Text style={styles.relationshipButtonText}>Declined</Text>
        </TouchableOpacity>
      );
    }
    
    return (
      <TouchableOpacity
        style={[styles.relationshipButton, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]}
        onPress={() => requestClientRelationship(client.id)}
        disabled={isRequesting}
      >
        <UserPlus color={colors.primary} size={14} />
        <Text style={[styles.relationshipButtonText, { color: colors.primary }]}>
          {isRequesting ? 'Requesting...' : 'Add Client'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderClientCard = ({ item: client }: { item: Profile }) => (
    <View style={[styles.clientCard, { backgroundColor: colors.card }]}>
      <View style={styles.clientInfo}>
        <View style={[styles.clientAvatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.clientInitial}>
            {client.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.clientDetails}>
          <Text style={[styles.clientName, { color: colors.text }]}>
            {client.name}
          </Text>
          <Text style={[styles.clientEmail, { color: colors.textSecondary }]}>
            {client.email}
          </Text>
        </View>
      </View>
      {renderRelationshipButton(client)}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Find Clients</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search color={colors.textSecondary} size={20} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search clients by name or email..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <FlatList
        data={filteredClients}
        renderItem={renderClientCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.clientsList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />

      {/* Package Creation Modal */}
      <Modal
        visible={showPackageModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPackageModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPackageModal(false)}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Package</Text>
            <TouchableOpacity
              onPress={() => {
                setShowPackageModal(false);
                router.push(`/(trainer)/create-package?clientId=${selectedClient?.id}`);
              }}
            >
              <Plus color={colors.primary} size={24} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={[styles.modalText, { color: colors.textSecondary }]}>
              Create a custom training package for {selectedClient?.name}
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
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
  searchContainer: { paddingHorizontal: 20, marginBottom: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  searchInput: { flex: 1, fontSize: 16 },
  clientsList: { paddingHorizontal: 20 },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  clientInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clientInitial: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  clientDetails: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  clientEmail: { fontSize: 14 },
  buttonContainer: { flexDirection: 'row', gap: 8 },
  relationshipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  relationshipButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  packageButton: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalContent: { flex: 1, paddingHorizontal: 20 },
  modalText: { fontSize: 16, textAlign: 'center', marginTop: 20 },
});
