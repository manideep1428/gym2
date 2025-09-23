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

  useEffect(() => {
    if (userProfile) {
      refreshNotifications();
      setupRealtimeSubscription();
      
      // Initialize notification service
      const notificationService = NotificationService.getInstance();
      notificationService.initializeNotificationListeners();
    }
  }, [userProfile]);

  const refreshNotifications = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    if (!userProfile) return;

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
        () => {
          refreshNotifications();
        }
      )
      .subscribe();

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
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const clearAllNotifications = async () => {
    if (notifications.length === 0) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userProfile?.id);

      if (error) throw error;

      // Clear local state
      setNotifications([]);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
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
