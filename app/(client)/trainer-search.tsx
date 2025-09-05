import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile, TrainingPackage } from '@/lib/supabase';
import { Search, Filter, Star, Calendar, ArrowRight, ArrowLeft, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface SearchFilters {
  specializations: string[];
  minRating: number;
  location: string;
}

export default function TrainerSearchScreen() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [trainers, setTrainers] = useState<Profile[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState<Profile | null>(null);
  const [trainerPackages, setTrainerPackages] = useState<TrainingPackage[]>([]);
  const [showTrainerModal, setShowTrainerModal] = useState(false);
  const [filteredTrainers, setFilteredTrainers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    specializations: [],
    minRating: 0,
    location: '',
  });

  const styles = createStyles(colors);

  useEffect(() => {
    fetchTrainers();
  }, []);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [searchQuery, trainers, filters]);

  useEffect(() => {
    if (selectedTrainer) {
      fetchTrainerPackages(selectedTrainer.id);
    }
  }, [selectedTrainer]);

  const fetchTrainers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'trainer')
        .order('rating', { ascending: false });

      if (error) throw error;
      setTrainers(data || []);
      setFilteredTrainers(data || []);
    } catch (error) {
      console.error('Error fetching trainers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainerPackages = async (trainerId: string) => {
    try {
      const { data, error } = await supabase
        .from('training_packages')
        .select('*')
        .eq('created_by', trainerId)
        .eq('is_active', true);

      if (error) throw error;
      setTrainerPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      setTrainerPackages([]);
    }
  };

  const applyFiltersAndSearch = () => {
    let filtered = trainers;

    // Apply text search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(trainer =>
        trainer.name.toLowerCase().includes(query) ||
        trainer.bio?.toLowerCase().includes(query) ||
        trainer.specializations?.some(spec => spec.toLowerCase().includes(query))
      );
    }

    // Apply filters
    if (filters.specializations.length > 0) {
      filtered = filtered.filter(trainer =>
        trainer.specializations?.some(spec => filters.specializations.includes(spec))
      );
    }

    if (filters.minRating > 0) {
      filtered = filtered.filter(trainer => (trainer.rating || 0) >= filters.minRating);
    }

    if (filters.location.trim()) {
      const locationQuery = filters.location.toLowerCase();
      filtered = filtered.filter(trainer =>
        trainer.bio?.toLowerCase().includes(locationQuery) ||
        trainer.name.toLowerCase().includes(locationQuery)
      );
    }

    setFilteredTrainers(filtered);
  };

  const toggleSpecialization = (specialization: string) => {
    setFilters(prev => ({
      ...prev,
      specializations: prev.specializations.includes(specialization)
        ? prev.specializations.filter(s => s !== specialization)
        : [...prev.specializations, specialization]
    }));
  };

  const renderTrainerCard = ({ item: trainer }: { item: Profile }) => (
    <TouchableOpacity
      style={[styles.trainerCard, { backgroundColor: colors.card }]}
      onPress={() => {
        setSelectedTrainer(trainer);
        setShowTrainerModal(true);
      }}
    >
      <View style={styles.trainerHeader}>
        <View style={styles.trainerImageContainer}>
          <Text style={[styles.trainerInitial, { color: colors.primary }]}>
            {trainer.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.trainerInfo}>
          <Text style={[styles.trainerName, { color: colors.text }]}>{trainer.name}</Text>
          <View style={styles.ratingContainer}>
            <Star color="#FFD700" size={14} fill="#FFD700" />
            <Text style={[styles.rating, { color: colors.textSecondary }]}>
              {trainer.rating?.toFixed(1)} ({trainer.total_reviews})
            </Text>
          </View>
        </View>
        <ArrowRight color={colors.textSecondary} size={20} />
      </View>

      <View style={styles.trainerDetails}>
        <Text style={[styles.specializations, { color: colors.textSecondary }]} numberOfLines={1}>
          {trainer.specializations?.join(' • ')}
        </Text>
        <Text style={[styles.experience, { color: colors.primary }]}>
          {trainer.experience_years} years experience
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.bookButton, { backgroundColor: colors.primary }]}
        onPress={() => router.push(`/(client)/book-session?trainerId=${trainer.id}`)}
      >
        <Calendar color="#FFFFFF" size={16} />
        <Text style={styles.bookButtonText}>Book Session</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderPackageCard = ({ item: pkg }: { item: TrainingPackage }) => (
    <View style={[styles.packageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.packageName, { color: colors.text }]}>{pkg.name}</Text>
      <Text style={[styles.packageDescription, { color: colors.textSecondary }]}>{pkg.description}</Text>
      <View style={styles.packageDetails}>
        <Text style={[styles.packagePrice, { color: colors.primary }]}>${pkg.price}</Text>
        <Text style={[styles.packageSessions, { color: colors.textSecondary }]}>
          {pkg.session_count} sessions • {pkg.duration_days} days
        </Text>
      </View>
    </View>
  );

  const availableSpecializations = Array.from(
    new Set(trainers.flatMap(trainer => trainer.specializations || []))
  ).sort();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading trainers...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Find Trainers</Text>
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
          <Filter color={colors.text} size={24} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search color={colors.textSecondary} size={20} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search trainers, specializations..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={[styles.filtersTitle, { color: colors.text }]}>Filters</Text>

          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Specializations</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.specializationsScroll}>
              {availableSpecializations.map((spec) => (
                <TouchableOpacity
                  key={spec}
                  style={[
                    styles.specializationChip,
                    {
                      backgroundColor: filters.specializations.includes(spec) ? colors.primary : colors.surface,
                      borderColor: filters.specializations.includes(spec) ? colors.primary : colors.border,
                    }
                  ]}
                  onPress={() => toggleSpecialization(spec)}
                >
                  <Text style={[
                    styles.specializationChipText,
                    { color: filters.specializations.includes(spec) ? '#FFFFFF' : colors.text }
                  ]}>
                    {spec}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <Text style={[styles.filterLabel, { color: colors.text }]}>Minimum Rating</Text>
            <View style={styles.ratingOptions}>
              {[0, 3, 4, 4.5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingOption,
                    {
                      backgroundColor: filters.minRating === rating ? colors.primary : colors.surface,
                      borderColor: filters.minRating === rating ? colors.primary : colors.border,
                    }
                  ]}
                  onPress={() => setFilters(prev => ({ ...prev, minRating: rating }))}
                >
                  <Text style={[
                    styles.ratingOptionText,
                    { color: filters.minRating === rating ? '#FFFFFF' : colors.text }
                  ]}>
                    {rating === 0 ? 'All' : `${rating}+`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsText, { color: colors.textSecondary }]}>
          {filteredTrainers.length} trainer{filteredTrainers.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Trainers List */}
      <FlatList
        data={filteredTrainers}
        renderItem={renderTrainerCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.trainersList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Search color={colors.textSecondary} size={48} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No trainers found matching your criteria
            </Text>
          </View>
        }
      />

      {/* Trainer Details Modal */}
      <Modal
        visible={showTrainerModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTrainerModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTrainerModal(false)} style={styles.backButton}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Trainer Details</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedTrainer && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.profileHeader}>
                <View style={styles.profileImageContainer}>
                  <Text style={[styles.profileInitial, { color: colors.primary }]}>
                    {selectedTrainer.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={[styles.profileName, { color: colors.text }]}>{selectedTrainer.name}</Text>
                  <View style={styles.profileRating}>
                    <Star color="#FFD700" size={20} fill="#FFD700" />
                    <Text style={[styles.profileRatingText, { color: colors.textSecondary }]}>
                      {selectedTrainer.rating?.toFixed(1)} ({selectedTrainer.total_reviews} reviews)
                    </Text>
                  </View>
                  <Text style={[styles.profileExperience, { color: colors.primary }]}>
                    {selectedTrainer.experience_years} years of experience
                  </Text>
                </View>
              </View>

              <View style={styles.profileSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
                <Text style={[styles.bio, { color: colors.textSecondary }]}>
                  {selectedTrainer.bio || 'No bio available'}
                </Text>
              </View>

              <View style={styles.profileSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Specializations</Text>
                <View style={styles.specializationTags}>
                  {selectedTrainer.specializations?.map((spec, index) => (
                    <View key={index} style={[styles.specializationTag, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
                      <Text style={[styles.specializationTagText, { color: colors.primary }]}>{spec}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.profileSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Packages</Text>
                {trainerPackages.length === 0 ? (
                  <View style={[styles.noPackagesContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.noPackagesText, { color: colors.textSecondary }]}>
                      No packages offering
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={trainerPackages}
                    renderItem={renderPackageCard}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                  />
                )}
              </View>

              <TouchableOpacity
                style={[styles.bookButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setShowTrainerModal(false);
                  router.push(`/(client)/book-session?trainerId=${selectedTrainer.id}`);
                }}
              >
                <Calendar color="#FFFFFF" size={20} />
                <Text style={styles.bookButtonText}>Book Session</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  specializationsScroll: {
    flexDirection: 'row',
  },
  specializationChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  specializationChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  ratingOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingOption: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    alignItems: 'center',
  },
  ratingOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  resultsHeader: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  resultsText: {
    fontSize: 14,
  },
  trainersList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  trainerCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  trainerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trainerImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trainerInitial: {
    fontSize: 20,
    fontWeight: '600',
  },
  trainerInfo: {
    flex: 1,
  },
  trainerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 12,
  },
  trainerDetails: {
    marginBottom: 16,
  },
  specializations: {
    fontSize: 12,
    marginBottom: 4,
  },
  experience: {
    fontSize: 12,
    fontWeight: '500',
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  profileInitial: {
    fontSize: 40,
    fontWeight: '600',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  profileRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  profileRatingText: {
    fontSize: 16,
  },
  profileExperience: {
    fontSize: 14,
    fontWeight: '500',
  },
  profileSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  bio: {
    fontSize: 16,
    lineHeight: 24,
  },
  specializationTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specializationTag: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  specializationTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  noPackagesContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  noPackagesText: {
    fontSize: 16,
    fontStyle: 'italic',
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
  packageDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  packageDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  packageSessions: {
    fontSize: 12,
  },
});
