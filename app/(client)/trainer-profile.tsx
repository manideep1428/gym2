import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase, Profile, TrainingPackage } from '@/lib/supabase';
import NotificationService from '@/lib/notificationService';
import { ContentLoadingOverlay, CardSkeleton } from '@/components/SkeletonLoader';
import { ArrowLeft, Star, Calendar, Heart, UserPlus, UserMinus, X, Trash2, AlertTriangle } from 'lucide-react-native';

export default function TrainerProfileScreen() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();
  const { trainerId } = useLocalSearchParams();

  const [trainer, setTrainer] = useState<Profile | null>(null);
  const [trainerPackages, setTrainerPackages] = useState<TrainingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [clientRelationships, setClientRelationships] = useState<any[]>([]);
  const [requestingTrainer, setRequestingTrainer] = useState<string | null>(null);

  const styles = createStyles(colors);

  // Array of 5 different colors for profile initials (same as trainer search)
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
    if (trainerId) {
      fetchTrainerProfile();
      fetchTrainerPackages();
      fetchClientRelationships();
    }
  }, [trainerId]);

  const fetchTrainerProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', trainerId)
        .eq('role', 'trainer')
        .single();

      if (error) throw error;
      setTrainer(data);
    } catch (error) {
      console.error('Error fetching trainer profile:', error);
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainerPackages = async () => {
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
      const { data, error } = await supabase
        .from('client_trainer_relationships')
        .select('*')
        .eq('client_id', userProfile.id);

      if (error) throw error;
      setClientRelationships(data || []);
    } catch (error) {
      console.error('Error fetching client relationships:', error);
    }
  };

  const requestTrainerRelationship = async (trainerId: string, message: string = '') => {
    if (!userProfile) return;
    
    setRequestingTrainer(trainerId);
    
    try {
      // Check if there's an existing terminated relationship
      const existingRelationship = clientRelationships.find(rel => 
        rel.trainer_id === trainerId && rel.status === 'terminated'
      );

      let relationshipData;
      
      if (existingRelationship) {
        // Update existing terminated relationship to pending
        const { data, error } = await supabase
          .from('client_trainer_relationships')
          .update({
            status: 'pending',
            client_message: message,
            requested_at: new Date().toISOString(),
            approved_at: null,
            rejected_at: null,
            terminated_at: null,
            trainer_response: null
          })
          .eq('id', existingRelationship.id)
          .select()
          .single();
          
        if (error) throw error;
        relationshipData = data;
      } else {
        // Create new relationship
        const { data, error } = await supabase
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
        relationshipData = data;
      }

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
    const relationship = clientRelationships.find(rel => rel.trainer_id === trainerId);
    // If relationship is terminated, allow re-requesting
    if (relationship?.status === 'terminated') {
      return null;
    }
    return relationship?.status || null;
  };

  const renderRelationshipButton = (trainer: Profile) => {
    const relationshipStatus = getRelationshipStatus(trainer.id);
    const isRequesting = requestingTrainer === trainer.id;
    
    if (relationshipStatus === 'approved') {
      return (
        <TouchableOpacity
          style={[styles.relationshipButton, { backgroundColor: colors.success || '#10B981' }]}
          disabled
        >
          <Heart color="#FFFFFF" size={16} fill="#FFFFFF" />
          <Text style={[styles.relationshipButtonText, { color: '#FFFFFF' }]}>My Trainer</Text>
        </TouchableOpacity>
      );
    }
    
    if (relationshipStatus === 'pending') {
      return (
        <TouchableOpacity
          style={[styles.relationshipButton, { backgroundColor: colors.warning || '#F59E0B' }]}
          disabled
        >
          <UserPlus color="#FFFFFF" size={16} />
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
          <X color="#FFFFFF" size={16} />
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
        <UserPlus color={colors.primary} size={16} />
        <Text style={[styles.relationshipButtonText, { color: colors.primary }]}>
          {isRequesting ? 'Requesting...' : 'Request as Client'}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderPackageCard = ({ item: pkg }: { item: TrainingPackage }) => (
    <View style={[styles.packageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.packageName, { color: colors.text }]}>{pkg.name}</Text>
      <Text style={[styles.packageDescription, { color: colors.textSecondary }]}>{pkg.description}</Text>
      <View style={styles.packageDetails}>
        <Text style={[styles.packagePrice, { color: colors.primary }]}>${pkg.price}</Text>
        <Text style={[styles.packageDetailsText, { color: colors.textSecondary }]}>
          {pkg.session_count} sessions • {pkg.duration_days} days
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Trainer Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <CardSkeleton height={120} hasAvatar={true} lines={3} />
          <CardSkeleton height={80} lines={2} />
          <CardSkeleton height={100} lines={3} />
        </View>
      </SafeAreaView>
    );
  }

  if (!trainer) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Trainer Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Trainer not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Trainer Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileHeader}>
          <View style={[styles.profileImageContainer, { backgroundColor: getProfileColor(trainer) }]}>
            <Text style={[styles.profileInitial, { color: '#FFFFFF' }]}>
              {trainer.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>{trainer.name}</Text>
            <View style={styles.profileRating}>
              <Star color="#FFD700" size={20} fill="#FFD700" />
              <Text style={[styles.profileRatingText, { color: colors.textSecondary }]}>
                {trainer.rating?.toFixed(1)} ({trainer.total_reviews} reviews)
              </Text>
            </View>
            <Text style={[styles.profileExperience, { color: colors.primary }]}>
              {trainer.experience_years} years of experience
            </Text>
          </View>
        </View>

        <View style={styles.profileSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
          <Text style={[styles.bio, { color: colors.textSecondary }]}>
            {trainer.bio || 'No bio available'}
          </Text>
        </View>

        <View style={styles.profileSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Specializations</Text>
          <View style={styles.specializationTags}>
            {trainer.specializations?.map((spec, index) => (
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
                No packages available
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

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[styles.bookButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push(`/(client)/book-session?trainerId=${trainer.id}`)}
          >
            <Calendar color="#FFFFFF" size={20} />
            <Text style={styles.bookButtonText}>Book Session</Text>
          </TouchableOpacity>
          
          {renderRelationshipButton(trainer)}
        </View>
      </ScrollView>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  profileInitial: {
    fontSize: 40,
    fontWeight: '600',
  },
  profileInfo: {
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
  packageDetailsText: {
    fontSize: 12,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  bookButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  relationshipButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  relationshipButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
});
