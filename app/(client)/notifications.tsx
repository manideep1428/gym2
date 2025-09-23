import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { supabase, Notification } from '@/lib/supabase';
import { Bell, Calendar, DollarSign, MessageSquare, CheckCircle, Heart, Volume2 } from 'lucide-react-native';
import NotificationService from '@/lib/notificationService';

export default function ClientNotifications() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const { notifications, refreshNotifications, markAsRead, markAllAsRead, clearAllNotifications, handleNotificationPress } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = createStyles(colors);

  useEffect(() => {
    setLoading(false);
  }, [notifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_request':
      case 'booking_confirmed':
      case 'booking_cancelled':
        return <Calendar color={colors.primary} size={20} />;
      case 'payment_request':
      case 'payment_approved':
        return <DollarSign color={colors.success} size={20} />;
      case 'connection_request':
      case 'connection_response':
        return <Heart color={colors.primary} size={20} />;
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
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const renderNotificationCard = ({ item: notification }: { item: Notification }) => (
    <View
      style={[
        styles.notificationCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        !notification.is_read && { backgroundColor: colors.primary + '05', borderColor: colors.primary + '30' }
      ]}
    >
      <TouchableOpacity
        style={styles.notificationContent}
        onPress={() => handleNotificationPress(notification)}
      >
        <View style={styles.notificationHeader}>
          <View style={styles.iconContainer}>
            {getNotificationIcon(notification.type)}
          </View>
          
          <View style={styles.notificationInfo}>
            <Text style={[styles.notificationTitle, { color: colors.text }]}>
              {notification.title}
            </Text>
            <Text style={[styles.notificationMessage, { color: colors.textSecondary }]}>
              {notification.message}
            </Text>
          </View>

          <View style={styles.notificationMeta}>
            <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
              {formatDate(notification.created_at)}
            </Text>
            {!notification.is_read && (
              <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
            )}
          </View>
        </View>
      </TouchableOpacity>
      
      {!notification.is_read && (
        <TouchableOpacity
          style={[styles.markReadButton, { backgroundColor: colors.primary + '10' }]}
          onPress={() => markAsRead(notification.id)}
        >
          <CheckCircle color={colors.primary} size={14} />
          <Text style={[styles.markReadText, { color: colors.primary }]}>Mark as read</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.testSoundButton, { backgroundColor: colors.primary + '10' }]}
            onPress={async () => {
              const notificationService = NotificationService.getInstance();
              await notificationService.testNotificationSound();
            }}
          >
            <Volume2 color={colors.primary} size={14} />
            <Text style={[styles.testSoundText, { color: colors.primary }]}>Test Sound</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.testSoundButton, { backgroundColor: colors.warning + '10' }]}
            onPress={async () => {
              const notificationService = NotificationService.getInstance();
              if (userProfile) {
                await notificationService.debugNotificationSetup(userProfile.id);
              }
            }}
          >
            <Text style={[styles.testSoundText, { color: colors.warning }]}>Debug Push</Text>
          </TouchableOpacity>
          {notifications.filter(n => !n.is_read).length > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={markAllAsRead}
            >
              <CheckCircle color={colors.primary} size={16} />
              <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all read</Text>
            </TouchableOpacity>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity
              style={[styles.clearAllButton, { backgroundColor: colors.error + '10', borderColor: colors.error }]}
              onPress={clearAllNotifications}
            >
              <Text style={[styles.clearAllText, { color: colors.error }]}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Bell color={colors.textSecondary} size={48} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            You'll see booking updates and messages here
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.notificationsList}
          showsVerticalScrollIndicator={false}
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
        />
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    marginTop: -20,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearAllButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  notificationsList: {
    paddingHorizontal: 20,
  },
  notificationCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationInfo: {
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
  },
  notificationMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  notificationTime: {
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  markReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    borderRadius: 6,
  },
  markReadText: {
    fontSize: 12,
    fontWeight: '500',
  },
  testSoundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  testSoundText: {
    fontSize: 12,
    fontWeight: '500',
  },
});