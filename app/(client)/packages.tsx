import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Alert } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, TrainingPackage, Profile } from '@/lib/supabase';
import { ContentLoadingOverlay, CardSkeleton, ListItemSkeleton, HeaderSkeleton } from '@/components/SkeletonLoader';
import { Package, User, Calendar, DollarSign, X, Clock } from 'lucide-react-native';

export default function ClientPackages() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const [packages, setPackages] = useState<(TrainingPackage & { trainer: Profile })[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<TrainingPackage | null>(null);
  const [loading, setLoading] = useState(true);

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
    } catch (error: any) {
      Alert.alert('Error', 'Failed to purchase package');
      console.error('Purchase error:', error);
    }
  };

  const renderPackageCard = ({ item: pkg }: { item: TrainingPackage & { trainer: Profile } }) => (
    <TouchableOpacity
      style={[styles.packageCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => setSelectedPackage(pkg)}
    >
      <View style={styles.packageHeader}>
        <Text style={[styles.packageName, { color: colors.text }]}>{pkg.name}</Text>
        <Text style={[styles.packagePrice, { color: colors.primary }]}>${pkg.price}</Text>
      </View>

      <Text style={[styles.packageDescription, { color: colors.textSecondary }]}>{pkg.description}</Text>

      <View style={styles.packageDetails}>
        <View style={styles.detailRow}>
          <Calendar color={colors.textSecondary} size={16} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            {pkg.session_count} sessions
          </Text>
        </View>

        <View style={styles.detailRow}>
          <User color={colors.textSecondary} size={16} />
          <Text style={[styles.detailText, { color: colors.textSecondary }]}>
            with {pkg.trainer.name}
          </Text>
        </View>
      </View>

      <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '20' }]}>
        <Text style={[styles.categoryText, { color: colors.primary }]}>{pkg.category}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Training Packages</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Choose the perfect package for your goals
          </Text>
        </View>

        {/* Loading Skeleton */}
        <View style={styles.packagesList}>
          {Array.from({ length: 6 }).map((_, index) => (
            <CardSkeleton
              key={index}
              height={140}
              hasAvatar={false}
              lines={4}
            />
          ))}
        </View>
      </View>
    );
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
        visible={!!selectedPackage}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedPackage(null)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedPackage(null)}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Package Details</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedPackage && (
            <View style={styles.modalContent}>
              <Text style={[styles.modalPackageName, { color: colors.text }]}>{selectedPackage.name}</Text>
              <Text style={[styles.modalPackagePrice, { color: colors.primary }]}>${selectedPackage.price}</Text>
              
              <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                {selectedPackage.description}
              </Text>

              <View style={styles.modalDetails}>
                <View style={styles.modalDetailRow}>
                  <Calendar color={colors.textSecondary} size={20} />
                  <Text style={[styles.modalDetailText, { color: colors.text }]}>
                    {selectedPackage.session_count} training sessions
                  </Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Clock color={colors.textSecondary} size={20} />
                  <Text style={[styles.modalDetailText, { color: colors.text }]}>
                    Valid for {selectedPackage.duration_days} days
                  </Text>
                </View>

                <View style={styles.modalDetailRow}>
                  <Package color={colors.textSecondary} size={20} />
                  <Text style={[styles.modalDetailText, { color: colors.text }]}>
                    {selectedPackage.category}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.purchaseButton, { backgroundColor: colors.primary }]}
                onPress={() => purchasePackage(selectedPackage.id)}
              >
                <DollarSign color="#FFFFFF" size={20} />
                <Text style={styles.purchaseButtonText}>Purchase Package</Text>
              </TouchableOpacity>
            </View>
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
    marginBottom: 8,
  },
  packageName: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  packageDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  packageDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalPackageName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalPackagePrice: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  modalDetails: {
    gap: 16,
    marginBottom: 32,
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalDetailText: {
    fontSize: 16,
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
    fontSize: 18,
    fontWeight: '600',
  },
});