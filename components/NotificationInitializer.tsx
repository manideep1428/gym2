import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/contexts/AuthContext';
import NotificationService from '@/lib/notificationService';

export default function NotificationInitializer() {
  const { userProfile } = useAuth();

  useEffect(() => {
    if (userProfile) {
      initializeNotifications();
    }
  }, [userProfile]);

  const initializeNotifications = async () => {
    try {
      const notificationService = NotificationService.getInstance();
      
      // Initialize notification listeners
      notificationService.initializeNotificationListeners();
      
      // Register for push notifications if user has enabled them
      try {
        await notificationService.registerForPushNotifications(userProfile!.id);
      } catch (error) {
        // User may have denied permissions - this is okay
        console.log('Push notifications not enabled:', error);
      }
      
      // Schedule reminders for existing confirmed bookings
      await notificationService.scheduleAllSessionReminders();
      
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  // This component doesn't render anything
  return null;
}
