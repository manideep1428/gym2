import { Platform } from 'react-native';
import { supabase } from './supabase';
import * as Device from 'expo-device';

// Conditionally import expo-notifications to avoid issues in Expo Go
let Notifications: any = null;

try {
  const notificationsModule = require('expo-notifications');
  Notifications = notificationsModule;
} catch (error) {
  console.warn('expo-notifications not available (likely in Expo Go):', error);
}

// Configure notification behavior only if available
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export interface NotificationData extends Record<string, unknown> {
  type: 'booking_request' | 'booking_accepted' | 'booking_rejected' | 'session_reminder' | 'booking_cancelled' | 'payment_request' | 'payment_confirmation' | 'connection_request' | 'connection_response' | 'custom_package' | 'package_response';
  bookingId?: string;
  trainerId?: string;
  clientId?: string;
  sessionTime?: string;
  trainerName?: string;
  clientName?: string;
  paymentId?: string;
  amount?: string;
  relationshipId?: string;
  requestStatus?: 'approved' | 'rejected';
  packageId?: string;
  packageName?: string;
  packageStatus?: 'accepted' | 'rejected';
}

class NotificationServiceFixed {
  private static instance: NotificationServiceFixed;
  
  static getInstance(): NotificationServiceFixed {
    if (!NotificationServiceFixed.instance) {
      NotificationServiceFixed.instance = new NotificationServiceFixed();
    }
    return NotificationServiceFixed.instance;
  }

  async requestPermissions(): Promise<boolean> {
    if (!Notifications) {
      console.warn('Notifications not available in this environment');
      return false;
    }

    try {
      // Check if device supports notifications
      if (!Device.isDevice) {
        console.warn('Must use physical device for Push Notifications');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push token for push notification!');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  async getExpoPushToken(): Promise<string | null> {
    if (!Notifications) {
      console.warn('Notifications not available in this environment');
      return null;
    }

    try {
      // Check if device supports notifications
      if (!Device.isDevice) {
        console.warn('Must use physical device for Push Notifications');
        return null;
      }

      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'f77908c5-de15-4bd0-8d89-603bd79d38ae', // Your EAS project ID
      })).data;
      
      console.log('✅ Got Expo push token:', token.substring(0, 20) + '...');
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  async registerForPushNotifications(userId: string): Promise<void> {
    try {
      console.log('🔔 Registering for push notifications for user:', userId);
      
      const hasPermission = await this.requestPermissions();
      
      if (!hasPermission) {
        console.warn('❌ Push notification permissions not granted');
        return;
      }

      const token = await this.getExpoPushToken();
      
      if (token) {
        console.log('💾 Saving push token to user profile...');
        
        // Save token to user profile
        const { error } = await supabase
          .from('profiles')
          .update({ push_token: token })
          .eq('id', userId);

        if (error) {
          console.error('❌ Error saving push token:', error);
          throw error;
        }

        console.log('✅ Push token saved successfully');

        // Create or update notification settings with push notifications enabled
        const { error: settingsError } = await supabase
          .from('notification_settings')
          .upsert({
            user_id: userId,
            push_notifications: true,
            booking_requests: true,
            booking_confirmations: true,
            session_reminders: true,
            cancellations: true,
          }, {
            onConflict: 'user_id'
          });

        if (settingsError) {
          console.error('❌ Error updating notification settings:', settingsError);
        } else {
          console.log('✅ Notification settings updated');
        }
      } else {
        console.warn('❌ Failed to get push token');
      }
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
      throw error;
    }
  }

  async sendLocalNotification(title: string, body: string, data?: NotificationData): Promise<void> {
    if (!Notifications) {
      console.warn('Notifications not available in this environment');
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'notifications.mp3',
        },
        trigger: null, // Show immediately
      });
      console.log('✅ Local notification sent:', title);
    } catch (error) {
      console.error('❌ Error sending local notification:', error);
    }
  }

  async sendPushNotification(
    pushToken: string,
    title: string,
    body: string,
    data?: NotificationData
  ): Promise<void> {
    try {
      const message = {
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high' as const,
        channelId: 'default'
      };

      console.log('🚀 Sending push notification:', {
        to: pushToken.substring(0, 20) + '...',
        title,
        body: body.substring(0, 50) + '...'
      });

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      console.log('📬 Push notification response:', result);
      
      if (!response.ok) {
        throw new Error(`Push notification failed: ${JSON.stringify(result)}`);
      }
    } catch (error) {
      console.error('❌ Error sending push notification:', error);
      throw error;
    }
  }

  async createInAppNotification(
    userId: string,
    title: string,
    message: string,
    type: string,
    data?: any
  ): Promise<void> {
    try {
      console.log('📱 Creating in-app notification:', { userId, title, type });
      
      const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        title,
        message,
        type,
        data: data || null,
      });

      if (error) {
        console.error('❌ Error creating in-app notification:', error);
        throw error;
      }

      console.log('✅ In-app notification created successfully');
    } catch (error) {
      console.error('❌ Error in createInAppNotification:', error);
      throw error;
    }
  }

  async notifyBookingRequest(trainerId: string, clientName: string, sessionTime: string): Promise<void> {
    try {
      console.log('📅 Sending booking request notification to trainer:', trainerId);

      // Get trainer's push token and notification settings
      const { data: trainerProfile } = await supabase
        .from('profiles')
        .select('push_token, name')
        .eq('id', trainerId)
        .single();

      const { data: settings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', trainerId)
        .single();

      const title = 'New Booking Request';
      const message = `${clientName} wants to book a session on ${sessionTime}`;

      // Always create in-app notification
      await this.createInAppNotification(trainerId, title, message, 'booking_request', {
        clientName,
        sessionTime
      });

      // Send push notification if enabled and token exists
      if (trainerProfile?.push_token && settings?.push_notifications && settings?.booking_requests) {
        await this.sendPushNotification(
          trainerProfile.push_token,
          title,
          message,
          {
            type: 'booking_request',
            clientName,
            sessionTime,
          }
        );
      }

      console.log('✅ Booking request notification sent successfully');
    } catch (error) {
      console.error('❌ Error sending booking request notification:', error);
    }
  }

  async notifyBookingStatus(
    clientId: string,
    trainerName: string,
    sessionTime: string,
    status: 'accepted' | 'rejected'
  ): Promise<void> {
    try {
      console.log('📅 Sending booking status notification to client:', clientId, status);

      // Get client's push token and notification settings
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('push_token, name')
        .eq('id', clientId)
        .single();

      const { data: settings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', clientId)
        .single();

      const title = status === 'accepted' ? 'Booking Confirmed!' : 'Booking Declined';
      const message = status === 'accepted' 
        ? `${trainerName} confirmed your session on ${sessionTime}`
        : `${trainerName} declined your session request for ${sessionTime}`;

      // Always create in-app notification
      await this.createInAppNotification(clientId, title, message, 
        status === 'accepted' ? 'booking_confirmed' : 'booking_cancelled', {
        trainerName,
        sessionTime,
        status
      });

      // Send push notification if enabled and token exists
      if (clientProfile?.push_token && settings?.push_notifications && settings?.booking_confirmations) {
        await this.sendPushNotification(
          clientProfile.push_token,
          title,
          message,
          {
            type: status === 'accepted' ? 'booking_accepted' : 'booking_rejected',
            trainerName,
            sessionTime,
          }
        );
      }

      console.log('✅ Booking status notification sent successfully');
    } catch (error) {
      console.error('❌ Error sending booking status notification:', error);
    }
  }

  async notifyPaymentRequest(
    clientId: string,
    trainerName: string,
    amount: number,
    description: string,
    paymentId: string
  ): Promise<void> {
    try {
      console.log('💰 Sending payment request notification to client:', clientId);

      // Get client's push token
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('push_token, name')
        .eq('id', clientId)
        .single();

      const title = 'Payment Request';
      const message = `${trainerName} sent you a payment request for $${amount} - ${description}`;

      // Always create in-app notification
      await this.createInAppNotification(clientId, title, message, 'payment_request', {
        trainerName,
        amount: amount.toString(),
        description,
        paymentId
      });

      // Send push notification if token exists
      if (clientProfile?.push_token) {
        await this.sendPushNotification(
          clientProfile.push_token,
          title,
          message,
          {
            type: 'payment_request',
            trainerName,
            amount: amount.toString(),
            paymentId,
          }
        );
      }

      console.log('✅ Payment request notification sent successfully');
    } catch (error) {
      console.error('❌ Error sending payment request notification:', error);
    }
  }

  async notifyPaymentConfirmation(
    trainerId: string,
    clientName: string,
    amount: number,
    paymentId: string
  ): Promise<void> {
    try {
      console.log('💰 Sending payment confirmation notification to trainer:', trainerId);

      // Get trainer's push token
      const { data: trainerProfile } = await supabase
        .from('profiles')
        .select('push_token, name')
        .eq('id', trainerId)
        .single();

      const title = 'Payment Received';
      const message = `${clientName} marked payment of $${amount} as paid`;

      // Always create in-app notification
      await this.createInAppNotification(trainerId, title, message, 'payment_confirmation', {
        clientName,
        amount: amount.toString(),
        paymentId
      });

      // Send push notification if token exists
      if (trainerProfile?.push_token) {
        await this.sendPushNotification(
          trainerProfile.push_token,
          title,
          message,
          {
            type: 'payment_confirmation',
            clientName,
            amount: amount.toString(),
            paymentId,
          }
        );
      }

      console.log('✅ Payment confirmation notification sent successfully');
    } catch (error) {
      console.error('❌ Error sending payment confirmation notification:', error);
    }
  }

  async notifyConnectionRequest(
    trainerId: string,
    clientName: string,
    relationshipId: string,
    clientMessage?: string
  ): Promise<void> {
    try {
      console.log('🤝 Sending connection request notification to trainer:', trainerId);

      // Get trainer's push token
      const { data: trainerProfile } = await supabase
        .from('profiles')
        .select('push_token, name')
        .eq('id', trainerId)
        .single();

      const title = 'New Client Request';
      const message = clientMessage 
        ? `${clientName} wants to be your client: "${clientMessage}"`
        : `${clientName} wants to be your client`;

      // Always create in-app notification
      await this.createInAppNotification(trainerId, title, message, 'connection_request', {
        relationshipId,
        clientName,
        clientMessage
      });

      // Send push notification if token exists
      if (trainerProfile?.push_token) {
        await this.sendPushNotification(
          trainerProfile.push_token,
          title,
          message,
          {
            type: 'connection_request',
            clientName,
            relationshipId,
          }
        );
      }

      console.log('✅ Connection request notification sent successfully');
    } catch (error) {
      console.error('❌ Error sending connection request notification:', error);
    }
  }

  async notifyTrainerAddedClient(
    clientId: string,
    trainerName: string,
    relationshipId: string,
    trainerMessage?: string
  ): Promise<void> {
    try {
      console.log('🤝 Sending trainer connection notification to client:', clientId);

      // Get client's push token
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('push_token, name')
        .eq('id', clientId)
        .single();

      const title = 'New Trainer Connection';
      const message = trainerMessage 
        ? `${trainerName} added you as their client: "${trainerMessage}"`
        : `${trainerName} has added you as their client`;

      // Always create in-app notification
      await this.createInAppNotification(clientId, title, message, 'connection_request', {
        relationshipId,
        trainerName,
        trainerMessage
      });

      // Send push notification if token exists
      if (clientProfile?.push_token) {
        await this.sendPushNotification(
          clientProfile.push_token,
          title,
          message,
          {
            type: 'connection_request',
            trainerName,
            relationshipId,
          }
        );
      }

      console.log('✅ Trainer connection notification sent successfully');
    } catch (error) {
      console.error('❌ Error sending trainer connection notification:', error);
    }
  }

  // Debug function to test notifications
  async testNotification(userId: string): Promise<void> {
    try {
      console.log('🧪 Testing notification system for user:', userId);
      
      // Test in-app notification
      await this.createInAppNotification(
        userId,
        'Test Notification',
        'This is a test notification to verify the system is working',
        'booking_request',
        { test: true }
      );

      // Test push notification if token exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_token, name')
        .eq('id', userId)
        .single();

      if (profile?.push_token) {
        await this.sendPushNotification(
          profile.push_token,
          'Test Push Notification',
          'This is a test push notification from GYM app',
          { type: 'booking_request' }
        );
      }

      console.log('✅ Test notification sent successfully');
    } catch (error) {
      console.error('❌ Error testing notification:', error);
    }
  }

  // Initialize notification listeners
  initializeNotificationListeners(): void {
    if (!Notifications) {
      console.warn('Notifications not available in this environment');
      return;
    }

    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener((notification: any) => {
      console.log('🔔 Notification received in foreground:', notification);
    });

    // Handle notification tapped
    Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification.request.content.data as unknown as NotificationData;
      console.log('👆 Notification tapped:', data);
      
      // Handle navigation based on notification type
      // This would be implemented based on your navigation structure
    });
  }
}

export default NotificationServiceFixed;
