import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ChevronLeft, User, Dumbbell } from 'lucide-react-native';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Register() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'client' as 'client' | 'trainer',
    bio: '',
    specializations: [] as string[],
    experience_years: 0,
  });

  const styles = createStyles(colors);

  const handleSubmit = async () => {
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!formData.name || !formData.email || !formData.phone || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await signUp(formData.email, formData.password, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        bio: formData.bio,
        specializations: formData.specializations,
        experience_years: formData.experience_years,
      });

      // Route based on the selected role
      if (formData.role === 'trainer') {
        router.replace('/(trainer)');
      } else {
        router.replace('/(client)');
      }
    } catch (error: any) {
      Alert.alert('Registration Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const addSpecialization = (spec: string) => {
    if (spec && !formData.specializations.includes(spec)) {
      setFormData({
        ...formData,
        specializations: [...formData.specializations, spec]
      });
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft color={colors.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
      </View>

      <View style={styles.form}>
        {/* Basic Information */}
        <View style={styles.section}>

          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Full Name"
            placeholderTextColor={colors.textSecondary}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />

          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Email"
            placeholderTextColor={colors.textSecondary}
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Phone Number"
            placeholderTextColor={colors.textSecondary}
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            keyboardType="phone-pad"
          />

          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Password"
            placeholderTextColor={colors.textSecondary}
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
            secureTextEntry
          />

          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Confirm Password"
            placeholderTextColor={colors.textSecondary}
            value={formData.confirmPassword}
            onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
            secureTextEntry
          />
        </View>

        {/* Role Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>I am a:</Text>

          <View style={styles.roleSelection}>
            <TouchableOpacity
              style={[
                styles.roleOption,
                { borderColor: colors.border, backgroundColor: colors.surface },
                formData.role === 'client' && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
              ]}
              onPress={() => setFormData({ ...formData, role: 'client' })}
            >
              <User color={formData.role === 'client' ? colors.primary : colors.textSecondary} size={32} />
              <Text style={[styles.roleText, { color: formData.role === 'client' ? colors.primary : colors.text }]}>
                Client
              </Text>
              <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
                Looking for trainers
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleOption,
                { borderColor: colors.border, backgroundColor: colors.surface },
                formData.role === 'trainer' && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
              ]}
              onPress={() => setFormData({ ...formData, role: 'trainer' })}
            >
              <Dumbbell color={formData.role === 'trainer' ? colors.primary : colors.textSecondary} size={32} />
              <Text style={[styles.roleText, { color: formData.role === 'trainer' ? colors.primary : colors.text }]}>
                Trainer
              </Text>
              <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>
                Offering services
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Trainer Additional Fields */}
        {formData.role === 'trainer' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Professional Information</Text>

            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Tell us about yourself and your training philosophy..."
              placeholderTextColor={colors.textSecondary}
              value={formData.bio}
              onChangeText={(text) => setFormData({ ...formData, bio: text })}
              multiline
              numberOfLines={4}
            />

            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder="Years of Experience"
              placeholderTextColor={colors.textSecondary}
              value={formData.experience_years.toString()}
              onChangeText={(text) => setFormData({ ...formData, experience_years: parseInt(text) || 0 })}
              keyboardType="numeric"
            />

            <Text style={[styles.label, { color: colors.text }]}>Specializations</Text>
            <View style={styles.specializationContainer}>
              {['Strength Training', 'Weight Loss', 'Bodybuilding', 'Yoga', 'Cardio', 'Nutrition', 'Flexibility', 'CrossFit'].map((spec) => (
                <TouchableOpacity
                  key={spec}
                  style={[
                    styles.specializationTag,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                    formData.specializations.includes(spec) && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
                  ]}
                  onPress={() => {
                    if (formData.specializations.includes(spec)) {
                      setFormData({
                        ...formData,
                        specializations: formData.specializations.filter(s => s !== spec)
                      });
                    } else {
                      addSpecialization(spec);
                    }
                  }}
                >
                  <Text style={[
                    styles.specializationText,
                    { color: formData.specializations.includes(spec) ? colors.primary : colors.text }
                  ]}>
                    {spec}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <LoadingSpinner size={20} color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={[styles.loginLinkText, { color: colors.textSecondary }]}>
            Already have an account? <Text style={{ color: colors.primary }}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 20,
  },
  form: {
    paddingHorizontal: 24,
    paddingBottom: 20
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 15,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },
  roleSelection: {
    flexDirection: 'row',
    gap: 15,
  },
  roleOption: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  roleDescription: {
    fontSize: 12,
    textAlign: 'center',
  },
  specializationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specializationTag: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  specializationText: {
    fontSize: 14,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  loginLinkText: {
    fontSize: 16,
  },
});