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
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export interface NotificationData extends Record<string, unknown> {
  type: 'booking_request' | 'booking_accepted' | 'booking_rejected' | 'session_reminder' | 'booking_cancelled' | 'payment_request' | 'payment_confirmation' | 'connection_request' | 'connection_response';
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
        sound: true,
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
          sound: true,
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
        sound: 'default',
        title,
        body,
        data,
      };

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
    } catch (error) {
      console.error('Error sending push notification:', error);
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

      if (trainerProfile?.push_token && settings?.push_notifications && settings?.booking_requests) {
        await this.sendPushNotification(
          trainerProfile.push_token,
          'New Booking Request',
          `${clientName} wants to book a session on ${sessionTime}`,
          {
            type: 'booking_request',
            clientName,
            sessionTime,
          }
        );
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

      if (clientProfile?.push_token && settings?.push_notifications && settings?.booking_confirmations) {
        const title = status === 'accepted' ? 'Booking Confirmed!' : 'Booking Declined';
        const body = status === 'accepted' 
          ? `${trainerName} confirmed your session on ${sessionTime}`
          : `${trainerName} declined your session request for ${sessionTime}`;

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

  async notifyConnectionRequest(
    trainerId: string,
    clientName: string,
    relationshipId: string,
    clientMessage?: string
  ): Promise<void> {
    try {
      // Get trainer's push token
      const { data: trainerProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', trainerId)
        .single();

      if (trainerProfile?.push_token) {
        const body = clientMessage 
          ? `${clientName} wants to connect: "${clientMessage}"`
          : `${clientName} wants to connect with you as their trainer`;

        await this.sendPushNotification(
          trainerProfile.push_token,
          'New Connection Request',
          body,
          {
            type: 'connection_request',
            clientName,
            relationshipId,
          }
        );
      }

      // Create in-app notification
      await supabase.from('notifications').insert({
        user_id: trainerId,
        title: 'New Connection Request',
        message: clientMessage 
          ? `${clientName} wants to connect: "${clientMessage}"`
          : `${clientName} wants to connect with you as their trainer`,
        type: 'connection_request',
        data: { relationshipId, clientName }
      });
    } catch (error) {
      console.error('Error sending connection request notification:', error);
    }
  }

  async notifyConnectionResponse(
    clientId: string,
    trainerName: string,
    status: 'approved' | 'rejected',
    relationshipId: string,
    trainerResponse?: string
  ): Promise<void> {
    try {
      // Get client's push token
      const { data: clientProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', clientId)
        .single();

      if (clientProfile?.push_token) {
        const title = status === 'approved' ? 'Connection Approved!' : 'Connection Request Declined';
        const body = status === 'approved'
          ? trainerResponse 
            ? `${trainerName} approved your request: "${trainerResponse}"`
            : `${trainerName} approved your connection request!`
          : trainerResponse
            ? `${trainerName} declined your request: "${trainerResponse}"`
            : `${trainerName} declined your connection request`;

        await this.sendPushNotification(
          clientProfile.push_token,
          title,
          body,
          {
            type: 'connection_response',
            trainerName,
            relationshipId,
            requestStatus: status,
          }
        );
      }

      // Create in-app notification
      const title = status === 'approved' ? 'Connection Approved!' : 'Connection Request Declined';
      const message = status === 'approved'
        ? trainerResponse 
          ? `${trainerName} approved your request: "${trainerResponse}"`
          : `${trainerName} approved your connection request!`
        : trainerResponse
          ? `${trainerName} declined your request: "${trainerResponse}"`
          : `${trainerName} declined your connection request`;

      await supabase.from('notifications').insert({
        user_id: clientId,
        title,
        message,
        type: 'connection_response',
        data: { relationshipId, trainerName, status }
      });
    } catch (error) {
      console.error('Error sending connection response notification:', error);
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

  // Initialize notification listeners
  initializeNotificationListeners(): void {
    if (!Notifications) {
      console.warn('Notifications not available in this environment');
      return;
    }

    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener((notification: any) => {
    });

    // Handle notification tapped
    Notifications.addNotificationResponseReceivedListener((response: any) => {
      const data = response.notification.request.content.data as unknown as NotificationData;
      
      // Handle navigation based on notification type
      // This would be implemented based on your navigation structure
    });
  }
}

export default NotificationService;
