import { Platform } from 'react-native';
import { supabase } from './supabase';

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

class NotificationService {
  private static instance: NotificationService;
  
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    if (!Notifications) {
      console.warn('Notifications not available in this environment');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  async getExpoPushToken(): Promise<string | null> {
    if (!Notifications) {
      console.warn('Notifications not available in this environment');
      return null;
    }

    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  async registerForPushNotifications(userId: string): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      
      if (!hasPermission) {
        throw new Error('Push notification permissions not granted');
      }

      const token = await this.getExpoPushToken();
      
      if (token) {
        // Save token to user profile
        await supabase
          .from('profiles')
          .update({ push_token: token })
          .eq('id', userId);
      }
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      throw error;
    }
  }

  async sendLocalNotification(title: string, body: string, data?: NotificationData): Promise<void> {
    if (!Notifications) {
      console.warn('Notifications not available in this environment');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'notifications.mp3', // Use custom sound
      },
      trigger: null, // Show immediately
    });
  }

  async scheduleSessionReminder(
    sessionTime: Date,
    reminderMinutes: number,
    bookingId: string,
    trainerName: string,
    clientName: string
  ): Promise<string | null> {
    if (!Notifications) {
      console.warn('Notifications not available in this environment');
      return null;
    }

    try {
      const reminderTime = new Date(sessionTime.getTime() - reminderMinutes * 60 * 1000);
      
      // Don't schedule if reminder time is in the past
      if (reminderTime <= new Date()) {
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Session Starting Soon!',
          body: `Your session with ${trainerName} starts in ${reminderMinutes} minutes`,
          data: {
            type: 'session_reminder',
            bookingId,
            trainerName,
            clientName,
          } as NotificationData,
          sound: 'notifications.mp3', // Use custom sound
        },
        trigger: {
          type: 'date',
          date: reminderTime,
        } as any,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling session reminder:', error);
      return null;
    }
  }

  async cancelScheduledNotification(notificationId: string): Promise<void> {
    if (!Notifications) {
      console.warn('Notifications not available in this environment');
      return;
    }

    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
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
        sound: 'default', // Use default sound for better compatibility
        title,
        body,
        data,
        priority: 'high',
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
      throw error; // Re-throw to help with debugging
    }
  }

  async notifyBookingRequest(trainerId: string, clientName: string, sessionTime: string): Promise<void> {
    try {
      // Get trainer's push token and notification settings
      const { data: trainerProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', trainerId)
        .single();

      const { data: settings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', trainerId)
        .single();

      const title = 'New Booking Request';
      const message = `${clientName} wants to book a session on ${sessionTime}`;

      console.log('📱 Sending booking request notification:', {
        trainerId,
        hasToken: !!trainerProfile?.push_token,
        token: trainerProfile?.push_token?.substring(0, 20) + '...',
        settings: settings
      });

      // Always create in-app notification
      await supabase.from('notifications').insert({
        user_id: trainerId,
        title,
        message,
        type: 'booking_request',
        data: { clientName, sessionTime }
      });

      // Send push notification if token exists (be more lenient with settings)
      if (trainerProfile?.push_token) {
        // Default to allowing notifications if settings don't exist or are not explicitly disabled
        const shouldSendPush = !settings || settings.push_notifications !== false;
        const shouldSendBookingRequests = !settings || settings.booking_requests !== false;
        
        if (shouldSendPush && shouldSendBookingRequests) {
          console.log('📤 Sending push notification to trainer');
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
        } else {
          console.log('🔕 Push notification disabled by settings');
        }
      } else {
        console.log('❌ No push token found for trainer');
      }
    } catch (error) {
      console.error('Error sending booking request notification:', error);
    }
  }

  async notifyBookingStatus(
    clientId: string,
    trainerName: string,
    sessionTime: string,
    status: 'accepted' | 'rejected'
  ): Promise<void> {
    try {
      // Get client's push token and notification settings
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', clientId)
        .single();

      const { data: settings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', clientId)
        .single();

      const title = status === 'accepted' ? 'Booking Confirmed!' : 'Booking Declined';
      const body = status === 'accepted' 
        ? `${trainerName} confirmed your session on ${sessionTime}`
        : `${trainerName} declined your session request for ${sessionTime}`;

      console.log('📱 Sending booking status notification:', {
        clientId,
        status,
        hasToken: !!clientProfile?.push_token,
        token: clientProfile?.push_token?.substring(0, 20) + '...',
        settings: settings
      });

      // Always create in-app notification
      await supabase.from('notifications').insert({
        user_id: clientId,
        title,
        message: body,
        type: status === 'accepted' ? 'booking_confirmed' : 'booking_cancelled',
        data: { trainerName, sessionTime, status }
      });

      // Send push notification if token exists (be more lenient with settings)
      if (clientProfile?.push_token) {
        // Default to allowing notifications if settings don't exist or are not explicitly disabled
        const shouldSendPush = !settings || settings.push_notifications !== false;
        const shouldSendBookingConfirmations = !settings || settings.booking_confirmations !== false;
        
        if (shouldSendPush && shouldSendBookingConfirmations) {
          console.log('📤 Sending push notification to client');
          await this.sendPushNotification(
            clientProfile.push_token,
            title,
            body,
            {
              type: status === 'accepted' ? 'booking_accepted' : 'booking_rejected',
              trainerName,
              sessionTime,
            }
          );
        } else {
          console.log('🔕 Push notification disabled by settings');
        }
      } else {
        console.log('❌ No push token found for client');
      }
    } catch (error) {
      console.error('Error sending booking status notification:', error);
    }
  }

  async notifySessionCancellation(
    userId: string,
    otherUserName: string,
    sessionTime: string,
    isTrainer: boolean
  ): Promise<void> {
    try {
      // Get user's push token and notification settings
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', userId)
        .single();

      const { data: settings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (userProfile?.push_token && settings?.push_notifications && settings?.cancellations) {
        const title = 'Session Cancelled';
        const body = isTrainer
          ? `Your client ${otherUserName} cancelled the session on ${sessionTime}`
          : `${otherUserName} cancelled your session on ${sessionTime}`;

        await this.sendPushNotification(
          userProfile.push_token,
          title,
          body,
          {
            type: 'booking_cancelled',
            trainerName: isTrainer ? undefined : otherUserName,
            clientName: isTrainer ? otherUserName : undefined,
            sessionTime,
          }
        );
      }
    } catch (error) {
      console.error('Error sending cancellation notification:', error);
    }
  }

  async notifyPaymentRequest(
    clientId: string,
    trainerName: string,
    amount: number,
    paymentId: string
  ): Promise<void> {
    try {
      // Get client's push token and notification settings
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', clientId)
        .single();

      const { data: settings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', clientId)
        .single();

      if (clientProfile?.push_token && settings?.push_notifications) {
        await this.sendPushNotification(
          clientProfile.push_token,
          'Payment Request',
          `${trainerName} sent you a payment request for $${amount}`,
          {
            type: 'payment_request',
            trainerName,
            amount: amount.toString(),
            paymentId,
          }
        );
      }
    } catch (error) {
      console.error('Error sending payment request notification:', error);
    }
  }

  async notifyPaymentConfirmation(
    trainerId: string,
    clientName: string,
    amount: number,
    paymentId: string
  ): Promise<void> {
    try {
      // Get trainer's push token and notification settings
      const { data: trainerProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', trainerId)
        .single();

      const { data: settings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', trainerId)
        .single();

      if (trainerProfile?.push_token && settings?.push_notifications) {
        await this.sendPushNotification(
          trainerProfile.push_token,
          'Payment Received',
          `${clientName} marked payment of $${amount} as paid`,
          {
            type: 'payment_confirmation',
            clientName,
            amount: amount.toString(),
            paymentId,
          }
        );
      }
    } catch (error) {
      console.error('Error sending payment confirmation notification:', error);
    }
  }

  async notifyTrainerAddedClient(
    clientId: string,
    trainerName: string,
    relationshipId: string,
    trainerMessage?: string
  ): Promise<void> {
    try {
      // Get client's push token
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', clientId)
        .single();

      if (clientProfile?.push_token) {
        const body = trainerMessage 
          ? `${trainerName} added you as their client: "${trainerMessage}"`
          : `${trainerName} has added you as their client`;

        await this.sendPushNotification(
          clientProfile.push_token,
          'New Trainer Connection',
          body,
          {
            type: 'connection_request',
            trainerName,
            relationshipId,
          }
        );
      }

      // Create in-app notification
      await supabase.from('notifications').insert({
        user_id: clientId,
        title: 'New Trainer Connection',
        message: trainerMessage 
          ? `${trainerName} added you as their client: "${trainerMessage}"`
          : `${trainerName} has added you as their client`,
        type: 'connection_request',
        data: { relationshipId, trainerName }
      });
    } catch (error) {
      console.error('Error sending trainer connection notification:', error);
    }
  }

  async notifyClientResponse(
    trainerId: string,
    clientName: string,
    status: 'approved' | 'rejected',
    relationshipId: string,
    clientResponse?: string
  ): Promise<void> {
    try {
      // Get trainer's push token
      const { data: trainerProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', trainerId)
        .single();

      if (trainerProfile?.push_token) {
        const title = status === 'approved' ? 'Client Accepted!' : 'Client Declined';
        const body = status === 'approved'
          ? clientResponse 
            ? `${clientName} accepted your invitation: "${clientResponse}"`
            : `${clientName} accepted your trainer invitation!`
          : clientResponse
            ? `${clientName} declined your invitation: "${clientResponse}"`
            : `${clientName} declined your trainer invitation`;

        await this.sendPushNotification(
          trainerProfile.push_token,
          title,
          body,
          {
            type: 'connection_response',
            clientName,
            relationshipId,
            requestStatus: status,
          }
        );
      }

      // Create in-app notification
      const title = status === 'approved' ? 'Client Accepted!' : 'Client Declined';
      const message = status === 'approved'
        ? clientResponse 
          ? `${clientName} accepted your invitation: "${clientResponse}"`
          : `${clientName} accepted your trainer invitation!`
        : clientResponse
          ? `${clientName} declined your invitation: "${clientResponse}"`
          : `${clientName} declined your trainer invitation`;

      await supabase.from('notifications').insert({
        user_id: trainerId,
        title,
        message,
        type: 'connection_response',
        data: { relationshipId, clientName, status }
      });
    } catch (error) {
      console.error('Error sending client response notification:', error);
    }
  }

  async notifyCustomPackage(
    clientId: string,
    trainerName: string,
    packageName: string,
    packageId: string
  ): Promise<void> {
    try {
      // Get client's push token and notification settings
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', clientId)
        .single();

      const { data: settings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', clientId)
        .single();

      if (clientProfile?.push_token && (settings?.push_notifications !== false)) {
        await this.sendPushNotification(
          clientProfile.push_token,
          'New Custom Package',
          `${trainerName} created a custom package for you: ${packageName}`,
          {
            type: 'custom_package',
            trainerName,
            packageName,
            packageId,
          }
        );
      }

      // Create in-app notification
      await supabase.from('notifications').insert({
        user_id: clientId,
        title: 'New Custom Package',
        message: `${trainerName} created a custom package for you: ${packageName}`,
        type: 'custom_package',
        data: { packageId, trainerName, packageName }
      });
    } catch (error) {
      console.error('Error sending custom package notification:', error);
    }
  }

  async notifyPackageResponse(
    trainerId: string,
    clientName: string,
    packageName: string,
    status: 'accepted' | 'rejected',
    packageId: string
  ): Promise<void> {
    try {
      // Get trainer's push token and notification settings
      const { data: trainerProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', trainerId)
        .single();

      const { data: settings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', trainerId)
        .single();

      if (trainerProfile?.push_token && (settings?.push_notifications !== false)) {
        const title = status === 'accepted' ? 'Package Accepted!' : 'Package Declined';
        const body = `${clientName} ${status} your package: ${packageName}`;

        await this.sendPushNotification(
          trainerProfile.push_token,
          title,
          body,
          {
            type: 'package_response',
            clientName,
            packageName,
            packageId,
            packageStatus: status,
          }
        );
      }

      // Create in-app notification
      const title = status === 'accepted' ? 'Package Accepted!' : 'Package Declined';
      const message = `${clientName} ${status} your package: ${packageName}`;

      await supabase.from('notifications').insert({
        user_id: trainerId,
        title,
        message,
        type: 'package_response',
        data: { packageId, clientName, packageName, status }
      });
    } catch (error) {
      console.error('Error sending package response notification:', error);
    }
  }

  async scheduleAllSessionReminders(): Promise<void> {
    try {
      // Get all upcoming bookings that are confirmed
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          *,
          trainer:profiles!bookings_trainer_id_fkey(name),
          client:profiles!bookings_client_id_fkey(name)
        `)
        .eq('status', 'confirmed')
        .gte('session_time', new Date().toISOString());

      if (!bookings) return;

      for (const booking of bookings) {
        // Get reminder settings for both trainer and client
        const { data: trainerSettings } = await supabase
          .from('notification_settings')
          .select('*')
          .eq('user_id', booking.trainer_id)
          .single();

        const { data: clientSettings } = await supabase
          .from('notification_settings')
          .select('*')
          .eq('user_id', booking.client_id)
          .single();

        const sessionTime = new Date(booking.session_time);

        // Schedule reminder for trainer
        if (trainerSettings?.session_reminders && trainerSettings?.push_notifications) {
          await this.scheduleSessionReminder(
            sessionTime,
            trainerSettings.reminder_time || 10,
            booking.id,
            booking.trainer.name,
            booking.client.name
          );
        }

        // Schedule reminder for client
        if (clientSettings?.session_reminders && clientSettings?.push_notifications) {
          await this.scheduleSessionReminder(
            sessionTime,
            clientSettings.reminder_time || 10,
            booking.id,
            booking.trainer.name,
            booking.client.name
          );
        }
      }
    } catch (error) {
      console.error('Error scheduling session reminders:', error);
    }
  }

  // Test notification sound
  async testNotificationSound(): Promise<void> {
    if (!Notifications) {
      console.warn('Notifications not available in this environment');
      return;
    }

    try {
      await this.sendLocalNotification(
        'Test Notification',
        'Testing custom notification sound from GYM app!',
        { type: 'booking_request' }
      );
    } catch (error) {
      console.error('Error testing notification sound:', error);
    }
  }

  // Debug function to check push token and settings
  async debugNotificationSetup(userId: string): Promise<void> {
    try {
      console.log('🔍 Debugging notification setup for user:', userId);
      
      // Check push token
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_token, name, role')
        .eq('id', userId)
        .single();
      
      console.log('📱 User profile:', {
        name: profile?.name,
        role: profile?.role,
        hasToken: !!profile?.push_token,
        tokenPreview: profile?.push_token?.substring(0, 20) + '...'
      });
      
      // Check notification settings
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      console.log('⚙️ Notification settings:', settings);
      
      // Test push notification if token exists
      if (profile?.push_token) {
        console.log('🧪 Testing push notification...');
        await this.sendPushNotification(
          profile.push_token,
          'Debug Test',
          'This is a test push notification from GYM app',
          { type: 'booking_request' }
        );
      } else {
        console.log('❌ No push token found - user needs to register for notifications');
      }
    } catch (error) {
      console.error('❌ Debug notification setup error:', error);
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
      console.log('Notification received in foreground:', notification);
    });

    // Handle notification tapped
    Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification.request.content.data as unknown as NotificationData;
      console.log('Notification tapped:', data);
      
      // Handle navigation based on notification type
      // This would be implemented based on your navigation structure
    });
  }
}

export default NotificationService;
