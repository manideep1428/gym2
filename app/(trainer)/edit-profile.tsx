import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, User, Phone, Mail, FileText, Award, Star } from 'lucide-react-native';

export default function EditTrainerProfile() {
  const { colors } = useTheme();
  const { userProfile, refreshProfile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    bio: '',
    specializations: '',
    experience_years: '',
  });

  const styles = createStyles(colors);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        phone: userProfile.phone || '',
        email: userProfile.email || '',
        bio: userProfile.bio || '',
        specializations: userProfile.specializations?.join(', ') || '',
        experience_years: userProfile.experience_years?.toString() || '',
      });
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!userProfile) return;

    if (!formData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    if (!formData.phone.trim()) {
      Alert.alert('Error', 'Phone number is required');
      return;
    }

    // Validate experience years if provided
    if (formData.experience_years && (isNaN(parseInt(formData.experience_years)) || parseInt(formData.experience_years) < 0)) {
      Alert.alert('Error', 'Please enter a valid number of years of experience');
      return;
    }

    setLoading(true);

    try {
      const updateData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        bio: formData.bio.trim() || null,
        specializations: formData.specializations 
          ? formData.specializations.split(',').map(s => s.trim()).filter(s => s)
          : null,
        experience_years: formData.experience_years 
          ? parseInt(formData.experience_years) 
          : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userProfile.id);

      if (error) throw error;

      await refreshProfile();
      Alert.alert('Success', 'Profile updated successfully');
      router.back();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading} style={styles.saveButton}>
          <Text style={{color: "orange"}}> Save </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Basic Information</Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <User color={colors.textSecondary} size={20} />
              <Text style={[styles.labelText, { color: colors.text }]}>Full Name</Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <Phone color={colors.textSecondary} size={20} />
              <Text style={[styles.labelText, { color: colors.text }]}>Phone Number</Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="Enter your phone number"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <Mail color={colors.textSecondary} size={20} />
              <Text style={[styles.labelText, { color: colors.text }]}>Email</Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.textSecondary }]}
              value={formData.email}
              editable={false}
              placeholder="Email address"
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              Email cannot be changed
            </Text>
          </View>
        </View>

        {/* Professional Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Professional Information</Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <FileText color={colors.textSecondary} size={20} />
              <Text style={[styles.labelText, { color: colors.text }]}>Bio</Text>
            </View>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={formData.bio}
              onChangeText={(text) => setFormData({ ...formData, bio: text })}
              placeholder="Tell clients about yourself, your training philosophy, and experience..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <Award color={colors.textSecondary} size={20} />
              <Text style={[styles.labelText, { color: colors.text }]}>Specializations</Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={formData.specializations}
              onChangeText={(text) => setFormData({ ...formData, specializations: text })}
              placeholder="e.g., Weight Loss, Strength Training, Yoga"
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              Separate multiple specializations with commas
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabel}>
              <Star color={colors.textSecondary} size={20} />
              <Text style={[styles.labelText, { color: colors.text }]}>Years of Experience</Text>
            </View>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={formData.experience_years}
              onChangeText={(text) => setFormData({ ...formData, experience_years: text })}
              placeholder="Enter years of experience"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  saveButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  labelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});