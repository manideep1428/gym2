import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile, TrainingPackage } from '@/lib/supabase';
import NotificationService from '@/lib/notificationService';
import { ContentLoadingOverlay, CardSkeleton, ListItemSkeleton, HeaderSkeleton } from '@/components/SkeletonLoader';
import { Search, Filter, Star, Calendar, ArrowRight, ArrowLeft, X, ChevronLeft, User, Heart, UserMinus, ChevronDown, Users, Trash2, UserPlus, AlertTriangle, Wifi, WifiOff, RefreshCw } from 'lucide-react-native';
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
  const [filteredTrainers, setFilteredTrainers] = useState<Profile[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    specializations: [],
    minRating: 0,
    location: '',
  });
  const [clientRelationships, setClientRelationships] = useState<any[]>([]);
  // Removed requestingTrainer state - clients can no longer request trainers
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [trainerToRemove, setTrainerToRemove] = useState<Profile | null>(null);
  // Removed cancellingRequest state - no longer needed since clients can't cancel requests
  const [expandedTrainerId, setExpandedTrainerId] = useState<string | null>(null);
  const [removeTimer, setRemoveTimer] = useState(5);
  const [canRemove, setCanRemove] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-trainers' | 'search'>('my-trainers');
  const [networkError, setNetworkError] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Replace single loading state with targeted loading states
  const [trainersLoading, setTrainersLoading] = useState(true);
  const [relationshipsLoading, setRelationshipsLoading] = useState(true);

  const styles = createStyles(colors);

  // Array of 5 different colors for profile initials
  const profileColors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FECA57', // Yellow
  ];

  // Function to get profile color - use user's chosen color or fallback to hash
  const getProfileColor = (trainer: Profile) => {
    if (trainer.profile_color) {
      return trainer.profile_color;
    }
    // Fallback to hash-based color for users who haven't set a custom color
    const hash = trainer.id.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    return profileColors[Math.abs(hash) % profileColors.length];
  };

  useEffect(() => {
    fetchTrainers();
    fetchClientRelationships();
  }, []);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [searchQuery, trainers, filters]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchTrainers(false),
        fetchClientRelationships(false)
      ]);
    } catch (error) {
      console.error('Error refreshing trainer search:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const retryNetworkRequest = async () => {
    setShowNetworkModal(false);
    setRetryCount(prev => prev + 1);
    await fetchTrainers(true);
    await fetchClientRelationships(false);
  };


  const fetchTrainers = async (showError = true) => {
    try {
      setTrainersLoading(true);
      setNetworkError(false);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'trainer')
        .order('rating', { ascending: false });

      if (error) throw error;
      setTrainers(data || []);
      setFilteredTrainers(data || []);
      setRetryCount(0);
    } catch (error) {
      console.error('Error fetching trainers:', error);
      setNetworkError(true);
      if (showError && retryCount < 2) {
        setShowNetworkModal(true);
      } else if (showError) {
        Alert.alert(
          'Network Error',
          'Unable to load trainers. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setTrainersLoading(false);
    }
  };


  const fetchClientRelationships = async (showError = true) => {
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
      if (showError) {
        setNetworkError(true);
      }
    } finally {
      setRelationshipsLoading(false);
    }
  };

  // Removed client request functionality - only trainers can initiate relationships now

  const getRelationshipStatus = (trainerId: string) => {
    const relationship = clientRelationships.find(rel => rel.trainer_id === trainerId);
    // If relationship is terminated, allow re-requesting
    if (relationship?.status === 'terminated') {
      return null;
    }
    return relationship?.status || null;
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

  // Removed cancelTrainerRequest - clients can no longer cancel requests since only trainers initiate

  const renderRelationshipButton = (trainer: Profile) => {
    const relationshipStatus = getRelationshipStatus(trainer.id);
    
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
          <Text style={[styles.relationshipButtonText, { color: '#FFFFFF' }]}>Pending Approval</Text>
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
    
    // No relationship - show info that trainer must add them
    return (
      <TouchableOpacity
        style={[styles.relationshipButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
        disabled
      >
        <User color={colors.textSecondary} size={14} />
        <Text style={[styles.relationshipButtonText, { color: colors.textSecondary }]}>
          Available
        </Text>
      </TouchableOpacity>
    );
  };

  const applyFiltersAndSearch = () => {
    let filtered = trainers;

    // Separate friend trainers from others
    const friendTrainers = filtered.filter(trainer => {
      const relationship = clientRelationships.find(rel => rel.trainer_id === trainer.id);
      return relationship?.status === 'approved';
    });

    const otherTrainers = filtered.filter(trainer => {
      const relationship = clientRelationships.find(rel => rel.trainer_id === trainer.id);
      return relationship?.status !== 'approved';
    });

    // Apply text search to other trainers only (friends are always shown)
    let searchFiltered = otherTrainers;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      searchFiltered = searchFiltered.filter(trainer =>
        trainer.name.toLowerCase().includes(query) ||
        trainer.bio?.toLowerCase().includes(query) ||
        trainer.specializations?.some(spec => spec.toLowerCase().includes(query))
      );
    }

    // Apply filters to other trainers
    if (filters.specializations.length > 0) {
      searchFiltered = searchFiltered.filter(trainer =>
        trainer.specializations?.some(spec => filters.specializations.includes(spec))
      );
    }

    if (filters.minRating > 0) {
      searchFiltered = searchFiltered.filter(trainer => (trainer.rating || 0) >= filters.minRating);
    }

    if (filters.location.trim()) {
      const locationQuery = filters.location.toLowerCase();
      searchFiltered = searchFiltered.filter(trainer =>
        trainer.bio?.toLowerCase().includes(locationQuery) ||
        trainer.name.toLowerCase().includes(locationQuery)
      );
    }

    // Combine friend trainers at top, then other trainers
    const combinedResults = [...friendTrainers, ...searchFiltered];
    setFilteredTrainers(combinedResults);
  };

  const toggleSpecialization = (specialization: string) => {
    setFilters(prev => ({
      ...prev,
      specializations: prev.specializations.includes(specialization)
        ? prev.specializations.filter(s => s !== specialization)
        : [...prev.specializations, specialization]
    }));
  };

  const toggleTrainerExpansion = (trainerId: string) => {
    setExpandedTrainerId(expandedTrainerId === trainerId ? null : trainerId);
  };

  const renderTrainerCard = ({ item: trainer }: { item: Profile }) => {
    const isExpanded = expandedTrainerId === trainer.id;
    const relationship = clientRelationships.find(r => r.trainer_id === trainer.id);
    
    return (
      <View style={[styles.compactTrainerCard, { backgroundColor: colors.card }]}>
        {/* Main Card Content */}
        <TouchableOpacity 
          style={styles.compactCardHeader}
          onPress={() => router.push(`/(client)/trainer-profile?trainerId=${trainer.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.compactTrainerInfo}>
            <View style={[styles.compactImageContainer, { backgroundColor: getProfileColor(trainer) }]}>
              <Text style={[styles.compactInitial, { color: '#FFFFFF' }]}>
                {trainer.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.compactDetails}>
              <Text style={[styles.compactName, { color: colors.text }]} numberOfLines={1}>
                {trainer.name}
              </Text>
              <View style={styles.trainerMeta}>
                <View style={styles.ratingContainer}>
                  <Star color="#FFD700" size={12} fill="#FFD700" />
                  <Text style={[styles.compactRating, { color: colors.textSecondary }]}>
                    {trainer.rating?.toFixed(1) || 'N/A'}
                  </Text>
                </View>
                <Text style={[styles.compactExperience, { color: colors.primary }]}>
                  {trainer.experience_years}y exp
                </Text>
              </View>
              <Text style={[styles.compactSpecializations, { color: colors.textSecondary }]} numberOfLines={1}>
                {trainer.specializations?.slice(0, 2).join(' • ') || 'General Training'}
              </Text>
            </View>
          </View>
          
          <View style={styles.compactActions}>
            <TouchableOpacity
              style={[styles.compactBookButton, { backgroundColor: colors.primary }]}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/(client)/book-session?trainerId=${trainer.id}`);
              }}
            >
              <Calendar color="#FFFFFF" size={16} />
              <Text style={styles.compactBookText}>Book Session</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.expandButton, { backgroundColor: isExpanded ? colors.primary + '20' : colors.surface }]}
              onPress={(e) => {
                e.stopPropagation();
                toggleTrainerExpansion(trainer.id);
              }}
            >
              <ArrowRight 
                color={isExpanded ? colors.primary : colors.textSecondary} 
                size={16} 
                style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
        
        {/* Expanded Content */}
        {isExpanded && (
          <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
            <View style={styles.expandedInfo}>
              <View style={styles.ratingContainer}>
                <Star color="#FFD700" size={12} fill="#FFD700" />
                <Text style={[styles.compactRating, { color: colors.textSecondary }]}>
                  {trainer.rating?.toFixed(1)} ({trainer.total_reviews})
                </Text>
              </View>
              <Text style={[styles.compactExperience, { color: colors.primary }]}>
                {trainer.experience_years} years exp
              </Text>
            </View>
            
            <View style={styles.expandedActions}>
              <TouchableOpacity
                style={[styles.expandedActionButton, { backgroundColor: colors.surface }]}
                onPress={() => router.push(`/(client)/trainer-profile?trainerId=${trainer.id}`)}
              >
                <User color={colors.text} size={14} />
                <Text style={[styles.expandedActionText, { color: colors.text }]}>View Profile</Text>
              </TouchableOpacity>
              
              {renderRelationshipButton(trainer)}
            </View>
          </View>
        )}
      </View>
    );
  };

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
          <Text style={[styles.title, { color: colors.text }]}>Trainers</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              { borderBottomColor: activeTab === 'my-trainers' ? colors.primary : 'transparent' }
            ]}
            onPress={() => setActiveTab('my-trainers')}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === 'my-trainers' ? colors.primary : colors.textSecondary }
            ]}>
              My Trainers (0)
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tab,
              { borderBottomColor: activeTab === 'search' ? colors.primary : 'transparent' }
            ]}
            onPress={() => setActiveTab('search')}
          >
            <Search color={activeTab === 'search' ? colors.primary : colors.textSecondary} size={16} />
            <Text style={[
              styles.tabText,
              { color: activeTab === 'search' ? colors.primary : colors.textSecondary }
            ]}>
              Search Trainers
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar - Only show in Search tab */}
        {activeTab === 'search' && (
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
        )}

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
        {activeTab === 'search' && (
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
            <Filter color={colors.text} size={24} />
          </TouchableOpacity>
        )}
        {activeTab === 'my-trainers' && <View style={{ width: 24 }} />}
      </View>


      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            { borderBottomColor: activeTab === 'my-trainers' ? colors.primary : 'transparent' }
          ]}
          onPress={() => setActiveTab('my-trainers')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'my-trainers' ? colors.primary : colors.textSecondary }
          ]}>
            My Trainers ({(() => {
              const myTrainers = clientRelationships.filter(rel => rel.status === 'approved');
              return myTrainers.length;
            })()})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            { borderBottomColor: activeTab === 'search' ? colors.primary : 'transparent' }
          ]}
          onPress={() => setActiveTab('search')}
        >
          <Search color={activeTab === 'search' ? colors.primary : colors.textSecondary} size={16} />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'search' ? colors.primary : colors.textSecondary }
          ]}>
            Search Trainers
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar - Only show in Search tab */}
      {activeTab === 'search' && (
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
      )}

      {/* Filters - Only show in Search tab */}
      {activeTab === 'search' && showFilters && (
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

      {/* Tab Content */}
      {activeTab === 'my-trainers' ? (
        (() => {
          const myTrainers = trainers.filter(trainer => {
            const relationship = clientRelationships.find(rel => rel.trainer_id === trainer.id);
            return relationship?.status === 'approved';
          });
          
          if (relationshipsLoading) {
            return (
              <View style={styles.trainersList}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <CardSkeleton
                    key={index}
                    height={120}
                    hasAvatar={true}
                    lines={3}
                  />
                ))}
              </View>
            );
          }
          
          if (myTrainers.length === 0) {
            return (
              <View style={styles.emptyContainer}>
                <Heart color={colors.textSecondary} size={48} />
                <Text style={[styles.emptyText, { color: colors.text }]}>No connected trainers</Text>
                <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                  Trainers will add you as their client when they choose to work with you
                </Text>
              </View>
            );
          }
          
          return (
            <FlatList
              data={myTrainers}
              renderItem={renderTrainerCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.trainersList}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                  title="Pull to refresh my trainers"
                  titleColor={colors.textSecondary}
                />
              }
            />
          );
        })()
      ) : (
        (() => {
          const searchTrainers = filteredTrainers.filter(trainer => {
            const relationship = clientRelationships.find(rel => rel.trainer_id === trainer.id);
            return relationship?.status !== 'approved';
          });
          
          return (
            <FlatList
              data={searchTrainers}
              renderItem={renderTrainerCard}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.trainersList}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                  title="Pull to refresh trainers"
                  titleColor={colors.textSecondary}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  {networkError ? (
                    <>
                      <WifiOff color={colors.error} size={48} />
                      <Text style={[styles.emptyText, { color: colors.text }]}>
                        Connection Problem
                      </Text>
                      <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                        Unable to load trainers. Check your internet connection.
                      </Text>
                      <TouchableOpacity
                        style={[styles.retryButton, { backgroundColor: colors.primary, marginTop: 16 }]}
                        onPress={retryNetworkRequest}
                      >
                        <RefreshCw color="#FFFFFF" size={16} />
                        <Text style={styles.retryButtonText}>Retry</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Search color={colors.textSecondary} size={48} />
                      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                        No trainers found matching your criteria
                      </Text>
                    </>
                  )}
                </View>
              }
            />
          );
        })()
      )}


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

      {/* Network Error Modal */}
      <Modal
        visible={showNetworkModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNetworkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.networkModalContainer, { backgroundColor: colors.card }]}>
            <View style={styles.networkModalHeader}>
              <WifiOff color={colors.error} size={32} />
              <Text style={[styles.networkModalTitle, { color: colors.text }]}>
                Connection Problem
              </Text>
            </View>
            
            <Text style={[styles.networkModalMessage, { color: colors.textSecondary }]}>
              Unable to load trainers. Please check your internet connection and try again.
            </Text>
            
            <View style={styles.networkModalActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.surface }]}
                onPress={() => setShowNetworkModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
                onPress={retryNetworkRequest}
              >
                <RefreshCw color="#FFFFFF" size={16} />
                <Text style={styles.retryButtonText}>Retry</Text>
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    gap: 8,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
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
  compactTrainerCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  compactCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  compactTrainerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  compactImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  compactInitial: {
    fontSize: 18,
    fontWeight: '700',
  },
  compactDetails: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  compactName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  trainerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 12,
  },
  compactSpecializations: {
    fontSize: 12,
    lineHeight: 16,
  },
  compactActions: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    minWidth: 80,
  },
  compactBookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    justifyContent: 'center',
  },
  compactBookText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  expandButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  expandedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  compactRating: {
    fontSize: 12,
    marginLeft: 4,
  },
  compactExperience: {
    fontSize: 12,
    fontWeight: '500',
  },
  expandedActions: {
    flexDirection: 'row',
    gap: 8,
  },
  expandedActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  expandedActionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  experience: {
    fontSize: 12,
    fontWeight: '500',
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
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
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
  friendTrainersSection: {
    marginBottom: 24,
  },
  searchResultsSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  friendTrainerCard: {
    marginBottom: 0,
  },
  pendingRequestContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cancelRequestButton: {
    padding: 8,
    borderRadius: 6,
  },
  networkModalContainer: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '90%',
  },
  networkModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  networkModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  networkModalMessage: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  networkModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
