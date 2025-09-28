import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, Notification } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import NotificationService from '@/lib/notificationService';
import { useRouter } from 'expo-router';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  handleNotificationPress: (notification: Notification) => void;
  showNotificationPanel: boolean;
  setShowNotificationPanel: (show: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [realtimeSubscription, setRealtimeSubscription] = useState<any>(null);
  const [isClearingNotifications, setIsClearingNotifications] = useState(false);

  useEffect(() => {
    if (userProfile) {
      refreshNotifications();
      setupRealtimeSubscription();
      
      // Initialize notification service and register for push notifications
      const notificationService = NotificationService.getInstance();
      notificationService.initializeNotificationListeners();
      
      // Register for push notifications
      registerForPushNotifications();
    }
  }, [userProfile]);

  const registerForPushNotifications = async () => {
    if (!userProfile) return;
    
    try {
      const notificationService = NotificationService.getInstance();
      await notificationService.registerForPushNotifications(userProfile.id);
      console.log('✅ Successfully registered for push notifications');
    } catch (error) {
      console.error('❌ Failed to register for push notifications:', error);
    }
  };

  const refreshNotifications = async () => {
    if (!userProfile) {
      console.log('🚫 Skipping notification refresh - no user profile');
      return;
    }
    if (isClearingNotifications) {
      console.log('🚫 Skipping notification refresh - currently clearing');
      return;
    }

    try {
      console.log('🔄 Refreshing notifications for user:', userProfile.id);

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Error fetching notifications:', error);
        return;
      }

      const notificationCount = data?.length || 0;
      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.is_read).length);

      console.log(`✅ Notifications refreshed: ${notificationCount} total, ${((data || []).filter(n => !n.is_read).length)} unread`);
    } catch (error) {
      console.error('❌ Error in refreshNotifications:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!userProfile) return;

    // Clean up existing subscription if any
    if (realtimeSubscription) {
      realtimeSubscription.unsubscribe();
    }

    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userProfile.id}`,
        },
        (payload) => {
          console.log('🔔 Realtime notification change:', payload);
          // Don't refresh if we're currently clearing notifications
          if (!isClearingNotifications) {
            refreshNotifications();
          } else {
            console.log('🚫 Skipping refresh - currently clearing notifications');
          }
        }
      )
      .subscribe();

    // Store the subscription reference for cleanup
    setRealtimeSubscription(subscription);

    return () => {
      subscription.unsubscribe();
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.is_read);
    if (unreadNotifications.length === 0) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadNotifications.map(n => n.id));

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const clearAllNotifications = async () => {
    if (notifications.length === 0) {
      console.log('🗑️ No notifications to clear');
      return;
    }

    try {
      console.log('🗑️ Starting clear all notifications for user:', userProfile?.id);
      console.log('📊 Current notifications in state:', notifications.length);

      // Set clearing flag immediately
      setIsClearingNotifications(true);

      // Verify user ID is available
      if (!userProfile?.id) {
        console.error('❌ No user profile ID available for clearing notifications');
        setIsClearingNotifications(false);
        return;
      }

      // First, get a count of notifications before deletion
      const { count: beforeCount, error: countError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userProfile.id);

      if (countError) {
        console.error('❌ Error counting notifications before deletion:', countError);
      } else {
        console.log('📊 Notifications in database before deletion:', beforeCount);
      }

      // Perform the deletion
      const { error, data } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userProfile.id)
        .select();

      if (error) {
        console.error('❌ Database deletion error:', error);
        setIsClearingNotifications(false);
        throw error;
      }

      console.log('✅ Database deletion successful, deleted items:', data?.length || 0);

      // Verify deletion by counting again
      const { count: afterCount, error: verifyError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userProfile.id);

      if (verifyError) {
        console.error('❌ Error verifying deletion:', verifyError);
      } else {
        console.log('🔍 Notifications in database after deletion:', afterCount);
        if (afterCount && afterCount > 0) {
          console.warn('⚠️ WARNING: Notifications still exist after deletion!');
        } else {
          console.log('✅ Database verification successful - no notifications remaining');
        }
      }

      // Clear local state immediately
      setNotifications([]);
      setUnreadCount(0);

      console.log('🎯 Local state cleared successfully');

      // Keep clearing flag for a bit longer to prevent race conditions
      setTimeout(() => {
        setIsClearingNotifications(false);
        console.log('✅ Clearing operation fully completed');
      }, 2000);

    } catch (error) {
      console.error('❌ Error in clearAllNotifications:', error);
      setIsClearingNotifications(false);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    const data = notification.data as any;
    
    switch (notification.type) {
      case 'connection_request':
        if (userProfile?.role === 'trainer') {
          router.push('/(trainer)/client-requests');
        }
        break;
        
      case 'connection_response':
        if (userProfile?.role === 'client') {
          router.push('/(client)/trainer-search');
        }
        break;
        
      case 'payment_request':
        if (userProfile?.role === 'client') {
          router.push('/(client)/payments');
        }
        break;
        
      case 'payment_confirmation':
        if (userProfile?.role === 'trainer') {
          router.push('/(trainer)/payments');
        }
        break;
        
      case 'booking_request':
        if (userProfile?.role === 'trainer') {
          router.push('/(trainer)/bookings');
        }
        break;
        
      case 'booking_accepted':
      case 'booking_rejected':
      case 'booking_cancelled':
        if (userProfile?.role === 'client') {
          router.push('/(client)/bookings');
        } else {
          router.push('/(trainer)/bookings');
        }
        break;
        
      default:
        // Default navigation
        break;
    }
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    handleNotificationPress,
    showNotificationPanel,
    setShowNotificationPanel,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
