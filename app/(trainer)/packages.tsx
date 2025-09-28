import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, TrainingPackage } from '@/lib/supabase';
import { Package, Plus, CreditCard as Edit, Trash2, X, DollarSign, Calendar, Clock, Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { CompactPackageCardSkeleton } from '@/components/SkeletonLoader';

export default function TrainerPackages() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();
  const [packages, setPackages] = useState<TrainingPackage[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<TrainingPackage | null>(null);
  const [newPackage, setNewPackage] = useState({
    name: '',
    description: '',
    category: 'Personal Training',
    price: '',
    session_count: '',
    duration_days: '',
  });
  const [loading, setLoading] = useState(true);

  const styles = createStyles(colors);

  const categories = ['Personal Training', 'Group Sessions', 'Nutrition Consultation', 'Custom'];

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('training_packages')
        .select('*')
        .eq('created_by', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPackage = async () => {
    if (!userProfile) return;

    if (!newPackage.name || !newPackage.price || !newPackage.session_count || !newPackage.duration_days) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('training_packages')
        .insert({
          name: newPackage.name,
          description: newPackage.description,
          category: newPackage.category,
          price: parseFloat(newPackage.price),
          session_count: parseInt(newPackage.session_count),
          duration_days: parseInt(newPackage.duration_days),
          created_by: userProfile.id,
        });

      if (error) throw error;

      Alert.alert('Success', 'Package created successfully!');
      setShowCreateModal(false);
      resetForm();
      fetchPackages();
    } catch (error) {
      Alert.alert('Error', 'Failed to create package');
      console.error('Create package error:', error);
    }
  };

  const deletePackage = async (packageId: string) => {
    Alert.alert(
      'Delete Package',
      'Are you sure you want to delete this package?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('training_packages')
                .delete()
                .eq('id', packageId);

              if (error) throw error;
              fetchPackages();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete package');
            }
          },
        },
      ]
    );
  };

  const togglePackageStatus = async (packageId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('training_packages')
        .update({ is_active: !currentStatus })
        .eq('id', packageId);

      if (error) throw error;
      fetchPackages();
    } catch (error) {
      Alert.alert('Error', 'Failed to update package status');
    }
  };

  const resetForm = () => {
    setNewPackage({
      name: '',
      description: '',
      category: 'Personal Training',
      price: '',
      session_count: '',
      duration_days: '',
    });
  };

  const renderPackageCard = ({ item: pkg }: { item: TrainingPackage }) => (
    <View style={[styles.packageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.packageHeader}>
        <View style={styles.packageInfo}>
          <Text style={[styles.packageName, { color: colors.text }]}>{pkg.name}</Text>
          <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.categoryText, { color: colors.primary }]}>{pkg.category}</Text>
          </View>
        </View>
        
        <View style={styles.packageActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => togglePackageStatus(pkg.id, pkg.is_active)}
          >
            <Text style={[styles.statusToggle, { color: pkg.is_active ? colors.success : colors.error }]}>
              {pkg.is_active ? 'Active' : 'Inactive'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => deletePackage(pkg.id)}
          >
            <Trash2 color={colors.error} size={16} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.packageDescription, { color: colors.textSecondary }]}>{pkg.description}</Text>

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
            Valid for {pkg.duration_days} days
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>My Packages</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {loading ? 'Loading...' : `${packages.filter(p => p.is_active).length} active packages`}
          </Text>
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.manageButton, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/(trainer)/package-management')}
          >
            <Settings color={colors.text} size={20} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowCreateModal(true)}
            disabled={loading}
          >
            <Plus color="#FFFFFF" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.packagesList}>
          <CompactPackageCardSkeleton />
          <CompactPackageCardSkeleton />
          <CompactPackageCardSkeleton />
          <CompactPackageCardSkeleton />
        </View>
      ) : packages.length === 0 ? (
        <View style={styles.emptyState}>
          <Package color={colors.textSecondary} size={48} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No packages created</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Create training packages for your clients to purchase
          </Text>
        </View>
      ) : (
        <FlatList
          data={packages}
          renderItem={renderPackageCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.packagesList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create/Edit Package Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Package</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView 
            style={styles.modalContent}
            contentContainerStyle={styles.modalScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Package Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g., Personal Training - Starter"
                placeholderTextColor={colors.textSecondary}
                value={newPackage.name}
                onChangeText={(text) => setNewPackage({ ...newPackage, name: text })}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Description</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="Describe what this package includes..."
                placeholderTextColor={colors.textSecondary}
                value={newPackage.description}
                onChangeText={(text) => setNewPackage({ ...newPackage, description: text })}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Category</Text>
              <View style={styles.categorySelector}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryOption,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                      newPackage.category === category && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                    ]}
                    onPress={() => setNewPackage({ ...newPackage, category })}
                  >
                    <Text style={[
                      styles.categoryOptionText,
                      { color: newPackage.category === category ? colors.primary : colors.text }
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formSection, { flex: 1, marginRight: 10 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Price ($)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="299.99"
                  placeholderTextColor={colors.textSecondary}
                  value={newPackage.price}
                  onChangeText={(text) => setNewPackage({ ...newPackage, price: text })}
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={[styles.formSection, { flex: 1, marginLeft: 10 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Sessions</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                  placeholder="8"
                  placeholderTextColor={colors.textSecondary}
                  value={newPackage.session_count}
                  onChangeText={(text) => setNewPackage({ ...newPackage, session_count: text })}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Validity (days)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                placeholder="30"
                placeholderTextColor={colors.textSecondary}
                value={newPackage.duration_days}
                onChangeText={(text) => setNewPackage({ ...newPackage, duration_days: text })}
                keyboardType="number-pad"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={createPackage}
            >
              <Package color="#FFFFFF" size={20} />
              <Text style={styles.submitButtonText}>Create Package</Text>
            </TouchableOpacity>
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
  formSection: {
    marginBottom: 24,
  },
  formRow: {
    flexDirection: 'row',
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  categorySelector: {
    gap: 8,
  },
  categoryOption: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});