import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity, Modal, Image, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile, TrainingPackage } from '@/lib/supabase';
import { Search, Star, MapPin, Calendar, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function ClientHome() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [trainers, setTrainers] = useState<Profile[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState<Profile | null>(null);
  const [trainerPackages, setTrainerPackages] = useState<TrainingPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = createStyles(colors);

  useEffect(() => {
    fetchTrainers();
  }, []);

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
    }
  };

  const filteredTrainers = trainers.filter(trainer =>
    trainer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trainer.specializations?.some(spec =>
      spec.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const renderTrainerCard = ({ item: trainer }: { item: Profile }) => (
    <TouchableOpacity
      style={styles.trainerCard}
      onPress={() => setSelectedTrainer(trainer)}
    >
      <View style={styles.trainerImageContainer}>
        <Image
          source={{ uri: trainer.avatar_url || 'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=300' }}
          style={styles.trainerImage}
        />
      </View>
      
      <View style={styles.trainerInfo}>
        <Text style={[styles.trainerName, { color: colors.text }]}>{trainer.name}</Text>
        
        <View style={styles.ratingContainer}>
          <Star color="#FFD700" size={16} fill="#FFD700" />
          <Text style={[styles.rating, { color: colors.textSecondary }]}>
            {trainer.rating?.toFixed(1)} ({trainer.total_reviews})
          </Text>
        </View>

        <Text style={[styles.specializations, { color: colors.textSecondary }]} numberOfLines={2}>
          {trainer.specializations?.join(', ')}
        </Text>

        <Text style={[styles.experience, { color: colors.primary }]}>
          {trainer.experience_years} years experience
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderPackageCard = ({ item: pkg }: { item: TrainingPackage }) => (
    <View style={[styles.packageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.text }]}>
          Hello, {userProfile?.name}!
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Find your perfect trainer
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search color={colors.textSecondary} size={20} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search trainers or specializations..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Trainers List */}
      <FlatList
        data={filteredTrainers}
        renderItem={renderTrainerCard}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.trainersList}
        showsVerticalScrollIndicator={false}
      />

      {/* Trainer Profile Modal */}
      <Modal
        visible={!!selectedTrainer}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedTrainer(null)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedTrainer(null)}>
              <X color={colors.text} size={24} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Trainer Profile</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedTrainer && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.profileHeader}>
                <Image
                  source={{ uri: selectedTrainer.avatar_url || 'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=400' }}
                  style={styles.profileImage}
                />
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
                <FlatList
                  data={trainerPackages}
                  renderItem={renderPackageCard}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </View>

              <TouchableOpacity
                style={[styles.bookButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setSelectedTrainer(null);
                  // Navigate to booking screen with trainer ID
                  router.push(`/(client)/book-session?trainerId=${selectedTrainer.id}`);
                }}
              >
                <Calendar color="#FFFFFF" size={20} />
                <Text style={styles.bookButtonText}>Book Session</Text>
              </TouchableOpacity>
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
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
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
  trainersList: {
    paddingHorizontal: 12,
  },
  trainerCard: {
    flex: 1,
    margin: 8,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  trainerImageContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  trainerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  trainerInfo: {
    alignItems: 'center',
  },
  trainerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  rating: {
    fontSize: 12,
  },
  specializations: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 6,
  },
  experience: {
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
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
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});