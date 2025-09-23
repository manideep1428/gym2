import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useRouter } from 'expo-router';
import { User, Moon, Sun, LogOut, Edit, Bell, Shield, Clock, Calendar, DollarSign, MessageSquare, CheckCircle, Heart, Users, Volume2 } from 'lucide-react-native';
import GoogleCalendarIntegration from '@/components/GoogleCalendarIntegration';
import NotificationService from '@/lib/notificationService';
import { TrainerNotificationsSkeleton } from '@/components/SkeletonLoader';

export default function TrainerSettings() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { userProfile, signOut } = useAuth();
  const { notifications, refreshNotifications, markAsRead, markAllAsRead, clearAllNotifications, handleNotificationPress } = useNotifications();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('notifications');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = createStyles(colors);

  useEffect(() => {
    setLoading(false);
  }, [notifications]);

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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_request':
      case 'booking_confirmed':
      case 'booking_cancelled':
        return <Calendar color={colors.primary} size={20} />;
      case 'payment_request':
      case 'payment_confirmation':
        return <DollarSign color={colors.success} size={20} />;
      case 'connection_request':
      case 'connection_response':
        return <Heart color={colors.primary} size={20} />;
      case 'client_request':
        return <Users color={colors.warning} size={20} />;
      case 'message':
        return <MessageSquare color={colors.warning} size={20} />;
      default:
        return <Bell color={colors.textSecondary} size={20} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const debugPushNotification = async () => {
    try {
      await NotificationService.debugNotificationSetup();
    } catch (error) {
      console.error('Debug push notification error:', error);
    }
  };

  const renderNotificationItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        { backgroundColor: colors.card, borderColor: colors.border },
        !item.is_read && { backgroundColor: colors.primary + '05' }
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <View style={styles.notificationIcon}>
            {getNotificationIcon(item.type)}
          </View>
          <View style={styles.notificationText}>
            <Text style={[styles.notificationTitle, { color: colors.text }]}>
              {item.title}
            </Text>
            <Text style={[styles.notificationMessage, { color: colors.textSecondary }]}>
              {item.message}
            </Text>
            <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>
          {!item.is_read && (
            <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
          )}
        </View>
        {!item.is_read && (
          <TouchableOpacity
            style={[styles.markReadButton, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}
            onPress={(e) => {
              e.stopPropagation();
              markAsRead(item.id);
            }}
          >
            <CheckCircle color={colors.primary} size={16} />
            <Text style={[styles.markReadText, { color: colors.primary }]}>Mark as read</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderNotificationsTab = () => {
    if (loading) {
      return <TrainerNotificationsSkeleton />;
    }

    return (
      <View style={styles.tabContent}>
        <View style={styles.notificationActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={markAllAsRead}
          >
            <CheckCircle color="#FFFFFF" size={16} />
            <Text style={styles.actionButtonText}>Mark All Read</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.error }]}
            onPress={clearAllNotifications}
          >
            <Text style={styles.actionButtonText}>Clear All</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.debugButton, { backgroundColor: colors.warning }]}
            onPress={debugPushNotification}
          >
            <Volume2 color="#FFFFFF" size={16} />
            <Text style={styles.actionButtonText}>Debug Push</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotificationItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              title="Pull to refresh notifications"
              titleColor={colors.textSecondary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Bell color={colors.textSecondary} size={48} />
              <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                No notifications yet
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  };

  const renderSettingsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
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

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Shield color={colors.textSecondary} size={20} />
            <Text style={[styles.settingText, { color: colors.text }]}>Privacy & Security</Text>
          </View>
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
  );

  const renderNotificationSettingsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Push Notifications</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Bell color={colors.textSecondary} size={20} />
            <View>
              <Text style={[styles.settingText, { color: colors.text }]}>Booking Notifications</Text>
              <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>Get notified about new bookings and updates</Text>
            </View>
          </View>
          <Switch
            value={true}
            onValueChange={() => {}}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={'#FFFFFF'}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <MessageSquare color={colors.textSecondary} size={20} />
            <View>
              <Text style={[styles.settingText, { color: colors.text }]}>Message Notifications</Text>
              <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>Receive notifications for new messages</Text>
            </View>
          </View>
          <Switch
            value={true}
            onValueChange={() => {}}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={'#FFFFFF'}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <DollarSign color={colors.textSecondary} size={20} />
            <View>
              <Text style={[styles.settingText, { color: colors.text }]}>Payment Notifications</Text>
              <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>Get notified about payments and earnings</Text>
            </View>
          </View>
          <Switch
            value={true}
            onValueChange={() => {}}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={'#FFFFFF'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Email Notifications</Text>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Bell color={colors.textSecondary} size={20} />
            <View>
              <Text style={[styles.settingText, { color: colors.text }]}>Weekly Summary</Text>
              <Text style={[styles.settingSubtext, { color: colors.textSecondary }]}>Receive weekly summary of your activity</Text>
            </View>
          </View>
          <Switch
            value={false}
            onValueChange={() => {}}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={'#FFFFFF'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.debugButton, { backgroundColor: colors.primary }]}
          onPress={debugPushNotification}
        >
          <Volume2 color="#FFFFFF" size={16} />
          <Text style={styles.debugButtonText}>Test Push Notifications</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'notifications' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setActiveTab('notifications')}
        >
          <Bell 
            color={activeTab === 'notifications' ? '#FFFFFF' : colors.textSecondary} 
            size={20} 
          />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'notifications' ? '#FFFFFF' : colors.textSecondary }
          ]}>
            Notifications
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'notification-settings' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setActiveTab('notification-settings')}
        >
          <Bell 
            color={activeTab === 'notification-settings' ? '#FFFFFF' : colors.textSecondary} 
            size={20} 
          />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'notification-settings' ? '#FFFFFF' : colors.textSecondary }
          ]}>
            Settings
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'settings' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setActiveTab('settings')}
        >
          <User 
            color={activeTab === 'settings' ? '#FFFFFF' : colors.textSecondary} 
            size={20} 
          />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'settings' ? '#FFFFFF' : colors.textSecondary }
          ]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'notifications' ? renderNotificationsTab() : 
       activeTab === 'notification-settings' ? renderNotificationSettingsTab() : 
       renderSettingsTab()}
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
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 12,
    padding: 4,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  // Notification styles
  notificationActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  debugButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  notificationItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  notificationContent: {
    gap: 12,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  notificationIcon: {
    marginTop: 2,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  markReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
  },
});