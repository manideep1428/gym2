import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Profile } from '@/lib/supabase';
import NotificationService from '@/lib/notificationService';
import { ArrowLeft, Package, Plus, X, DollarSign, Calendar, Users } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function CreatePackageScreen() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();
  const { clientId } = useLocalSearchParams();

  const isPublicPackage = !clientId;

  const [client, setClient] = useState<Profile | null>(null);
  const [packageName, setPackageName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [sessionsIncluded, setSessionsIncluded] = useState('1');
  const [validityDays, setValidityDays] = useState('30');
  const [features, setFeatures] = useState<string[]>(['']);
  const [termsConditions, setTermsConditions] = useState('');
  const [loading, setLoading] = useState(false);

  const styles = createStyles(colors);

  useEffect(() => {
    if (clientId) {
      fetchClient();
    }
  }, [clientId]);

  const fetchClient = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId)
        .single();

      if (error) throw error;
      setClient(data);
    } catch (error) {
      console.error('Error fetching client:', error);
      Alert.alert('Error', 'Failed to load client information');
      router.back();
    }
  };

  const addFeature = () => {
    setFeatures([...features, '']);
  };

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...features];
    newFeatures[index] = value;
    setFeatures(newFeatures);
  };

  const removeFeature = (index: number) => {
    if (features.length > 1) {
      setFeatures(features.filter((_, i) => i !== index));
    }
  };

  const createPackage = async () => {
    if (!userProfile) return;

    if (isPublicPackage) {
      // Validation for public package
      if (!packageName.trim() || !price.trim() || !category.trim() || !sessionsIncluded.trim() || !validityDays.trim()) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }
    } else {
      // Validation for custom package
      if (!client || !packageName.trim() || !price.trim() || !sessionsIncluded.trim()) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }
    }

    setLoading(true);

    try {
      if (isPublicPackage) {
        // Create public package
        const { data, error } = await supabase
          .from('training_packages')
          .insert({
            name: packageName.trim(),
            description: description.trim(),
            category: category.trim(),
            price: parseFloat(price),
            session_count: parseInt(sessionsIncluded),
            duration_days: parseInt(validityDays),
            is_active: true,
            created_by: userProfile.id,
          })
          .select()
          .single();

        if (error) throw error;

        Alert.alert(
          'Success',
          'Public package created successfully!',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        // Create custom package (existing logic)
        // Get the relationship ID
        const { data: relationship, error: relationshipError } = await supabase
          .from('client_trainer_relationships')
          .select('id')
          .eq('trainer_id', userProfile.id)
          .eq('client_id', client!.id)
          .eq('status', 'approved')
          .single();

        if (relationshipError) {
          Alert.alert('Error', 'You must have an approved relationship with this client first');
          return;
        }

        const filteredFeatures = features.filter(f => f.trim() !== '');

        const { data, error } = await supabase
          .from('custom_packages')
          .insert({
            trainer_id: userProfile.id,
            client_id: client!.id,
            relationship_id: relationship.id,
            name: packageName.trim(),
            description: description.trim(),
            price: parseFloat(price),
            sessions_included: parseInt(sessionsIncluded),
            validity_days: parseInt(validityDays),
            features: filteredFeatures,
            terms_conditions: termsConditions.trim(),
          })
          .select()
          .single();

        if (error) throw error;

        // Send notification to client
        const notificationService = NotificationService.getInstance();
        await notificationService.notifyCustomPackage(
          client!.id,
          userProfile.name,
          packageName,
          data.id
        );

        Alert.alert(
          'Success',
          'Package created and sent to client successfully!',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Error creating package:', error);
      Alert.alert('Error', 'Failed to create package. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {isPublicPackage ? 'Create Public Package' : 'Create Package'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {client && (
          <View style={[styles.clientInfo, { backgroundColor: colors.card }]}>
            <View style={[styles.clientAvatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.clientInitial}>
                {client.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.clientName, { color: colors.text }]}>
                Creating package for {client.name}
              </Text>
              <Text style={[styles.clientEmail, { color: colors.textSecondary }]}>
                {client.email}
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Package Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Package Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., Premium Training Package"
              placeholderTextColor={colors.textSecondary}
              value={packageName}
              onChangeText={setPackageName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Describe what this package includes..."
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {isPublicPackage && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Category *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g., Weight Loss, Strength Training"
                placeholderTextColor={colors.textSecondary}
                value={category}
                onChangeText={setCategory}
              />
            </View>
          )}

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Price ($) *</Text>
              <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <DollarSign color={colors.textSecondary} size={20} />
                <TextInput
                  style={[styles.inputText, { color: colors.text }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Sessions *</Text>
              <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Users color={colors.textSecondary} size={20} />
                <TextInput
                  style={[styles.inputText, { color: colors.text }]}
                  placeholder="1"
                  placeholderTextColor={colors.textSecondary}
                  value={sessionsIncluded}
                  onChangeText={setSessionsIncluded}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Validity (Days)</Text>
            <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Calendar color={colors.textSecondary} size={20} />
              <TextInput
                style={[styles.inputText, { color: colors.text }]}
                placeholder="30"
                placeholderTextColor={colors.textSecondary}
                value={validityDays}
                onChangeText={setValidityDays}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {!isPublicPackage && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Package Features</Text>
              <TouchableOpacity onPress={addFeature} style={[styles.addButton, { backgroundColor: colors.primary }]}>
                <Plus color="#FFFFFF" size={16} />
              </TouchableOpacity>
            </View>

            {features.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <TextInput
                  style={[styles.featureInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder={`Feature ${index + 1}`}
                  placeholderTextColor={colors.textSecondary}
                  value={feature}
                  onChangeText={(value) => updateFeature(index, value)}
                />
                {features.length > 1 && (
                  <TouchableOpacity onPress={() => removeFeature(index)} style={styles.removeButton}>
                    <X color={colors.error} size={16} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {!isPublicPackage && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Terms & Conditions</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Add any terms and conditions for this package..."
              placeholderTextColor={colors.textSecondary}
              value={termsConditions}
              onChangeText={setTermsConditions}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        )}

        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          onPress={createPackage}
          disabled={loading}
        >
          <Package color="#FFFFFF" size={20} />
          <Text style={styles.createButtonText}>
            {loading ? 'Creating Package...' : (isPublicPackage ? 'Create Public Package' : 'Create & Send Package')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  content: { flex: 1, paddingHorizontal: 20 },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  clientInitial: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  clientName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  clientEmail: { fontSize: 14 },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
  },
  row: { flexDirection: 'row' },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  inputText: { flex: 1, paddingVertical: 12, fontSize: 16 },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  featureInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  removeButton: {
    padding: 8,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
