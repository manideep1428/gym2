import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useRouter } from 'expo-router';
import { User, Moon, Sun, LogOut, Edit, Bell, Shield, Clock, Palette, X, ChevronRight } from 'lucide-react-native';
import GoogleCalendarIntegration from '@/components/GoogleCalendarIntegration';
import ColorPicker from '@/components/ColorPicker';
import { supabase } from '@/lib/supabase';

export default function TrainerSettings() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { userProfile, signOut, refreshProfile } = useAuth();
  const { unreadCount } = useNotifications();
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={[styles.profileSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.profileInfo}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <User color="#FFFFFF" size={32} />
            </View>
            <View style={styles.profileDetails}>
              <Text style={[styles.profileName, { color: colors.text }]}>{userProfile?.name}</Text>
              <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{userProfile?.email}</Text>
              <Text style={[styles.profileRole, { color: colors.primary }]}>Trainer</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={() => router.push('/(trainer)/edit-profile')}
          >
            <Edit color={colors.textSecondary} size={20} />
          </TouchableOpacity>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
          
          <TouchableOpacity 
            style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, marginBottom: 8 }]}
            onPress={() => router.push('/(trainer)/notifications')}
          >
            <View style={styles.settingInfo}>
              <Bell color={colors.textSecondary} size={20} />
              <View>
                <Text style={[styles.settingText, { color: colors.text }]}>Notifications</Text>
              </View>
            </View>
            <View style={styles.settingRight}>
              {unreadCount > 0 && (
                <View style={[styles.notificationBadge, { backgroundColor: colors.error }]}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
              <ChevronRight color={colors.textSecondary} size={20} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Google Calendar Integration */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Calendar Integration</Text>
          <GoogleCalendarIntegration/>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          
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
        </View>

        {/* Business Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Business</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => router.push('/(trainer)/availability')}
          >
            <View style={styles.settingInfo}>
              <Clock color={colors.textSecondary} size={20} />
              <Text style={[styles.settingText, { color: colors.text }]}>Availability</Text>
            </View>
            <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>
              Set your available hours
            </Text>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
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
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
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
    padding: 16,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
  settingSubtext: {
    fontSize: 12,
    marginLeft: 32,
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