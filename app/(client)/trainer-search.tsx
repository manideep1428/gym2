import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile, TrainingPackage } from '@/lib/supabase';
import NotificationService from '@/lib/notificationService';
import { ContentLoadingOverlay, CardSkeleton, ListItemSkeleton, HeaderSkeleton } from '@/components/SkeletonLoader';
import { Search, Filter, Star, Calendar, ArrowRight, ArrowLeft, X, UserPlus, Heart, Trash2, AlertTriangle } from 'lucide-react-native';
import { Users, User } from 'lucide-react-native';
import { NotificationBadge } from '@/components/NotificationBadge';
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
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    specializations: [],
    minRating: 0,
    location: '',
  });
  const [clientRelationships, setClientRelationships] = useState<any[]>([]);
  const [requestingTrainer, setRequestingTrainer] = useState<string | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [trainerToRemove, setTrainerToRemove] = useState<any>(null);
  const [removeTimer, setRemoveTimer] = useState(5);
  const [canRemove, setCanRemove] = useState(false);

  // Replace single loading state with targeted loading states
  const [trainersLoading, setTrainersLoading] = useState(true);
  const [relationshipsLoading, setRelationshipsLoading] = useState(true);
  const [packagesLoading, setPackagesLoading] = useState(false);

  const styles = createStyles(colors);

  useEffect(() => {
    fetchTrainers();
    fetchClientRelationships();
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
      setTrainersLoading(true);
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
      setTrainersLoading(false);
    }
  };

  const fetchTrainerPackages = async (trainerId: string) => {
    try {
      setPackagesLoading(true);
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
    } finally {
      setPackagesLoading(false);
    }
  };

  const fetchClientRelationships = async () => {
    if (!userProfile) return;

    try {
      setRelationshipsLoading(true);
      const { data, error } = await supabase
        .from('client_trainer_relationships')
        .select('*')
        .eq('client_id', userProfile.id);

      if (error) throw error;
      setClientRelationships(data || []);
    } catch (error) {
      console.error('Error fetching client relationships:', error);
    } finally {
      setRelationshipsLoading(false);
    }
  };

  const requestTrainerRelationship = async (trainerId: string, message: string = '') => {
    if (!userProfile) return;
    
    setRequestingTrainer(trainerId);
    
    try {
      const { data: relationshipData, error } = await supabase
        .from('client_trainer_relationships')
        .insert({
          client_id: userProfile.id,
          trainer_id: trainerId,
          client_message: message,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification to trainer
      const notificationService = NotificationService.getInstance();
      await notificationService.notifyConnectionRequest(
        trainerId,
        userProfile.name,
        relationshipData.id,
        message
      );
      
      // Refresh relationships
      await fetchClientRelationships();
      
      // Show success notification
      alert('Request sent successfully! The trainer will review your request.');
    } catch (error) {
      console.error('Error requesting trainer relationship:', error);
      alert('Failed to send request. Please try again.');
    } finally {
      setRequestingTrainer(null);
    }
  };

  const getRelationshipStatus = (trainerId: string) => {
    return clientRelationships.find(rel => rel.trainer_id === trainerId)?.status || null;
  };

  const showRemoveConfirmation = (trainer: Profile) => {
    setTrainerToRemove(trainer);
    setShowRemoveModal(true);
    setRemoveTimer(5);
    setCanRemove(false);
    
    // Start countdown
    const interval = setInterval(() => {
      setRemoveTimer(prev => {
        if (prev <= 1) {
          setCanRemove(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const removeTrainer = async () => {
    if (!trainerToRemove || !canRemove || !userProfile) return;

    try {
      const { error } = await supabase
        .from('client_trainer_relationships')
        .update({ status: 'terminated', terminated_at: new Date().toISOString() })
        .eq('client_id', userProfile.id)
        .eq('trainer_id', trainerToRemove.id);

      if (error) throw error;

      // Refresh relationships
      await fetchClientRelationships();
      
      setShowRemoveModal(false);
      setTrainerToRemove(null);
      alert('Trainer relationship terminated successfully.');
    } catch (error) {
      console.error('Error removing trainer:', error);
      alert('Failed to remove trainer. Please try again.');
    }
  };

  const renderRelationshipButton = (trainer: Profile) => {
    const relationshipStatus = getRelationshipStatus(trainer.id);
    const isRequesting = requestingTrainer === trainer.id;
    
    if (relationshipStatus === 'approved') {
      return (
        <View style={styles.approvedTrainerContainer}>
          <TouchableOpacity
            style={[styles.relationshipButton, { backgroundColor: colors.success || '#10B981' }]}
            disabled
          >
            <Heart color="#FFFFFF" size={14} fill="#FFFFFF" />
            <Text style={[styles.relationshipButtonText, { color: '#FFFFFF' }]}>My Trainer</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.removeTrainerButton, { backgroundColor: colors.error + '10' }]}
            onPress={() => showRemoveConfirmation(trainer)}
          >
            <Trash2 color={colors.error} size={14} />
          </TouchableOpacity>
        </View>
      );
    }
    
    if (relationshipStatus === 'pending') {
      return (
        <TouchableOpacity
          style={[styles.relationshipButton, { backgroundColor: colors.warning || '#F59E0B' }]}
          disabled
        >
          <UserPlus color="#FFFFFF" size={14} />
          <Text style={[styles.relationshipButtonText, { color: '#FFFFFF' }]}>Pending</Text>
        </TouchableOpacity>
      );
    }
    
    if (relationshipStatus === 'rejected') {
      return (
        <TouchableOpacity
          style={[styles.relationshipButton, { backgroundColor: colors.error || '#EF4444' }]}
          disabled
        >
          <X color="#FFFFFF" size={14} />
          <Text style={[styles.relationshipButtonText, { color: '#FFFFFF' }]}>Declined</Text>
        </TouchableOpacity>
      );
    }
    
    return (
      <TouchableOpacity
        style={[styles.relationshipButton, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]}
        onPress={() => requestTrainerRelationship(trainer.id)}
        disabled={isRequesting}
      >
        <UserPlus color={colors.primary} size={14} />
        <Text style={[styles.relationshipButtonText, { color: colors.primary }]}>
          {isRequesting ? 'Requesting...' : 'Request'}
        </Text>
      </TouchableOpacity>
    );
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

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.bookButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push(`/(client)/book-session?trainerId=${trainer.id}`)}
        >
          <Calendar color="#FFFFFF" size={16} />
          <Text style={styles.bookButtonText}>Book Session</Text>
        </TouchableOpacity>
        
        {renderRelationshipButton(trainer)}
      </View>
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

  if (trainersLoading) {
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
              editable={false}
            />
          </View>
        </View>

        {/* Loading Skeleton */}
        <View style={styles.trainersList}>
          {Array.from({ length: 6 }).map((_, index) => (
            <CardSkeleton
              key={index}
              height={120}
              hasAvatar={true}
              lines={3}
            />
          ))}
        </View>
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
                {packagesLoading ? (
                  <View style={{ gap: 12 }}>
                    <CardSkeleton height={80} lines={2} />
                    <CardSkeleton height={80} lines={2} />
                  </View>
                ) : trainerPackages.length === 0 ? (
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

              <View style={styles.modalButtonContainer}>
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
                
                {renderRelationshipButton(selectedTrainer)}
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Remove Trainer Confirmation Modal */}
      <Modal
        visible={showRemoveModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRemoveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.removeModalContainer, { backgroundColor: colors.card }]}>
            <View style={styles.removeModalHeader}>
              <AlertTriangle color={colors.error} size={24} />
              <Text style={[styles.removeModalTitle, { color: colors.text }]}>
                Remove Trainer
              </Text>
            </View>
            
            <Text style={[styles.removeModalMessage, { color: colors.textSecondary }]}>
              Are you sure you want to remove {trainerToRemove?.name} as your trainer? This will terminate your relationship and cannot be undone.
            </Text>
            
            <View style={styles.removeModalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.surface }]}
                onPress={() => setShowRemoveModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.confirmRemoveButton,
                  { 
                    backgroundColor: canRemove ? colors.error : colors.error + '50',
                    opacity: canRemove ? 1 : 0.5
                  }
                ]}
                onPress={removeTrainer}
                disabled={!canRemove}
              >
                <Text style={styles.confirmRemoveButtonText}>
                  {canRemove ? 'Remove' : `Wait ${removeTimer}s`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  packageSessions: {
    fontSize: 12,
    marginTop: 4,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  relationshipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
    flex: 1,
  },
  relationshipButtonText: {
    fontSize: 10,
    fontWeight: '600',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
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
  approvedTrainerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  removeTrainerButton: {
    padding: 8,
    borderRadius: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeModalContainer: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '90%',
  },
  removeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  removeModalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  removeModalMessage: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  removeModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmRemoveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmRemoveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
