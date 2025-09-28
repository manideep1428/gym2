import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, ThemeContextType } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { User, Moon, Sun, LogOut, CreditCard as Edit, Settings, Bell, Pencil, Palette, X } from 'lucide-react-native';
import GoogleCalendarIntegration from '@/components/GoogleCalendarIntegration';
import ColorPicker from '@/components/ColorPicker';
import { supabase } from '@/lib/supabase';

export default function ClientAccount() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { userProfile, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [updatingColor, setUpdatingColor] = useState(false);

  const styles = createStyles(colors);


  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleColorSelect = async (color: string) => {
    if (!userProfile) return;
    
    setUpdatingColor(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ profile_color: color })
        .eq('id', userProfile.id);

      if (error) throw error;
      
      // Refresh user profile to get updated color
      await refreshProfile();
      setShowColorPicker(false);
      
      Alert.alert('Success', 'Your profile color has been updated!');
    } catch (error) {
      console.error('Error updating profile color:', error);
      Alert.alert('Error', 'Failed to update profile color. Please try again.');
    } finally {
      setUpdatingColor(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Account</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Section */}
        <LinearGradient
          colors={[colors.card, colors.surface]}
          style={[styles.profileSection, { borderColor: colors.border }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0.3 }}
        >
          <View style={styles.profileInfo}>
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientEnd]}
              style={styles.avatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <User color="#FFFFFF" size={32} />
            </LinearGradient>
            <View style={styles.profileDetails}>
              <Text style={[styles.profileName, { color: colors.text }]}>{userProfile?.name}</Text>
              <Text style={[styles.profileRole, { color: colors.accent }]}>Client</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={() => router.push('/(client)/edit-profile')}
          >
            <Pencil color={colors.textSecondary} size={20} />
          </TouchableOpacity>
        </LinearGradient>

        {/* Google Calendar Integration */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Calendar Integration</Text>
          <GoogleCalendarIntegration />
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              {isDark ? <Moon color={colors.textSecondary} size={20} /> : <Sun color={colors.textSecondary} size={20} />}
              <Text style={[styles.settingText, { color: colors.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDark ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowColorPicker(true)}
          >
            <View style={styles.settingInfo}>
              <Palette color={colors.textSecondary} size={20} />
              <Text style={[styles.settingText, { color: colors.text }]}>Profile Color</Text>
            </View>
            {userProfile?.profile_color && (
              <View style={[styles.colorPreview, { backgroundColor: userProfile.profile_color }]} />
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => router.push('/(client)/notification-settings')}
          >
            <View style={styles.settingInfo}>
              <Bell color={colors.textSecondary} size={20} />
              <Text style={[styles.settingText, { color: colors.text }]}>Notification Settings</Text>
            </View>
          </TouchableOpacity>

          {/* <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <Settings color={colors.textSecondary} size={20} />
              <Text style={[styles.settingText, { color: colors.text }]}>Preferences</Text>
            </View>
          </TouchableOpacity> */}
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.signOutButton, { backgroundColor: colors.error + '10', borderColor: colors.error }]}
            onPress={handleSignOut}
          >
            <LogOut color={colors.error} size={20} />
            <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Profile Color</Text>
              <TouchableOpacity
                onPress={() => setShowColorPicker(false)}
                style={styles.closeButton}
              >
                <X color={colors.textSecondary} size={24} />
              </TouchableOpacity>
            </View>
            
            <ColorPicker
              selectedColor={userProfile?.profile_color}
              onColorSelect={handleColorSelect}
              title=""
            />
            
            {updatingColor && (
              <View style={styles.loadingOverlay}>
                <Text style={[styles.loadingText, { color: colors.text }]}>Updating...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeContextType['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 12,
    fontWeight: '500',
  },
  editProfileButton: {
    padding: 8,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500',
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
});