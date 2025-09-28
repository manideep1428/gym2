import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, TrainingPackage, Profile } from '@/lib/supabase';
import { ContentLoadingOverlay, CardSkeleton, ListItemSkeleton, HeaderSkeleton, ClientPackagesSkeleton } from '@/components/SkeletonLoader';
import { Package, User, Calendar, DollarSign, X, Clock, ChevronRight } from 'lucide-react-native';

export default function ClientPackages() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const [packages, setPackages] = useState<(TrainingPackage & { trainer: Profile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<(TrainingPackage & { trainer: Profile }) | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const styles = createStyles(colors);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('training_packages')
        .select(`
          *,
          trainer:profiles!created_by(*)
        `)
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const purchasePackage = async (packageId: string) => {
    if (!userProfile) return;

    try {
      const selectedPkg = packages.find(p => p.id === packageId);
      if (!selectedPkg) return;

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + selectedPkg.duration_days);

      const { error } = await supabase
        .from('user_packages')
        .insert({
          user_id: userProfile.id,
          package_id: packageId,
          sessions_remaining: selectedPkg.session_count,
          expiry_date: expiryDate.toISOString(),
        });

      if (error) throw error;

      Alert.alert('Success', 'Package purchased successfully!');
      setSelectedPackage(null);
      setModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to purchase package');
      console.error('Purchase error:', error);
    }
  };

  const openPackageDetails = (pkg: TrainingPackage & { trainer: Profile }) => {
    setSelectedPackage(pkg);
    setModalVisible(true);
  };

  const closePackageDetails = () => {
    setSelectedPackage(null);
    setModalVisible(false);
  };

  const renderPackageCard = ({ item: pkg }: { item: TrainingPackage & { trainer: Profile } }) => (
    <TouchableOpacity 
      style={[styles.compactPackageCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => openPackageDetails(pkg)}
    >
      <View style={styles.compactCardContent}>
        <View style={styles.compactLeftContent}>
          <Package color={colors.textSecondary} size={16} />
          <View style={styles.compactTextContent}>
            <Text style={[styles.compactPackageName, { color: colors.text }]} numberOfLines={1}>
              {pkg.name}
            </Text>
            <Text style={[styles.compactPackagePrice, { color: colors.primary }]}>
              ${pkg.price}
            </Text>
          </View>
        </View>
        
        <View style={styles.compactRightContent}>
          <View style={[styles.compactCategoryBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.compactCategoryText, { color: colors.primary }]} numberOfLines={1}>
              {pkg.category}
            </Text>
          </View>
          <ChevronRight color={colors.textSecondary} size={16} />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <ClientPackagesSkeleton />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Training Packages</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Choose the perfect package for your goals
        </Text>
      </View>

      {packages.length === 0 ? (
        <View style={styles.emptyState}>
          <Package color={colors.textSecondary} size={48} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No packages available</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Check back later for new training packages
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

      {/* Package Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closePackageDetails}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={closePackageDetails} style={styles.modalCloseButton}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Package Details</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedPackage && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Package Header */}
              <View style={[styles.modalSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.modalPackageName, { color: colors.text }]}>{selectedPackage.name}</Text>
                <Text style={[styles.modalPackagePrice, { color: colors.primary }]}>${selectedPackage.price}</Text>
                <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={[styles.categoryText, { color: colors.primary }]}>{selectedPackage.category}</Text>
                </View>
              </View>

              {/* Package Description */}
              <View style={[styles.modalSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Description</Text>
                <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                  {selectedPackage.description}
                </Text>
              </View>

              {/* Package Details */}
              <View style={[styles.modalSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.modalSectionTitle, { color: colors.text }]}>Package Details</Text>
                <View style={styles.modalDetails}>
                  <View style={styles.modalDetailRow}>
                    <Calendar color={colors.textSecondary} size={18} />
                    <Text style={[styles.modalDetailText, { color: colors.text }]}>
                      {selectedPackage.session_count} training sessions
                    </Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Clock color={colors.textSecondary} size={18} />
                    <Text style={[styles.modalDetailText, { color: colors.text }]}>
                      Valid for {selectedPackage.duration_days} days
                    </Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <User color={colors.textSecondary} size={18} />
                    <Text style={[styles.modalDetailText, { color: colors.text }]}>
                      Trainer: {selectedPackage.trainer.name}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Purchase Button */}
              <View style={[styles.modalSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.purchaseButton, { backgroundColor: colors.primary }]}
                  onPress={() => purchasePackage(selectedPackage.id)}
                >
                  <DollarSign color="#FFFFFF" size={20} />
                  <Text style={styles.purchaseButtonText}>Purchase Package</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
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
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  packagesList: {
    paddingHorizontal: 20,
  },
  compactPackageCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  compactTextContent: {
    flex: 1,
  },
  compactPackageName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  compactPackagePrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  compactRightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  compactCategoryText: {
    fontSize: 10,
    fontWeight: '500',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    backgroundColor: 'transparent',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalPackageName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalPackagePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalDetails: {
    gap: 12,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalDetailText: {
    fontSize: 14,
    flex: 1,
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
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});