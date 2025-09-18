import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Conditionally import Google Signin to avoid issues in Expo Go
let GoogleSignin: any = null;
let statusCodes: any = null;

try {
  const googleSigninModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSigninModule.GoogleSignin;
  statusCodes = googleSigninModule.statusCodes;
} catch (error) {
  console.warn('Google Signin not available (likely in Expo Go):', error);
}

// Google Calendar API configuration
// These should be loaded from environment variables in production
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "446928845689-b6ml0pbcdv0a0cq05mqter9099pumlji.apps.googleusercontent.com";

const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
];

// Initialize Google Sign-In only if available
if (GoogleSignin) {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: GOOGLE_CALENDAR_SCOPES,
    offlineAccess: true,
    hostedDomain: '',
    forceCodeForRefreshToken: true,
  });
}

export interface GoogleCalendarTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{ email: string; displayName?: string }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

class GoogleCalendarService {
  private baseURL = 'https://www.googleapis.com/calendar/v3';

  // Initialize Google OAuth using Google Sign-In
  async authenticateWithGoogle(): Promise<GoogleCalendarTokens | null> {
    if (!GoogleSignin) {
      throw new Error('Google Signin is not available in this environment (Expo Go)');
    }

    try {
      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices();
      
      // Sign in user
      const userInfo = await GoogleSignin.signIn();
      
      // Get access token
      const tokens = await GoogleSignin.getTokens();
      
      if (tokens.accessToken) {
        const googleTokens: GoogleCalendarTokens = {
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_in: 3600, // Default 1 hour, will be refreshed automatically
          token_type: 'Bearer',
        };
        
        await this.saveTokensToProfile(googleTokens);
        return googleTokens;
      }

      return null;
    } catch (error: any) {
      console.error('Google Calendar authentication error:', error);
      
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Sign in was cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Sign in is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services not available');
      } else {
        throw new Error('Failed to authenticate with Google Calendar');
      }
    }
  }

  // Check if user is already signed in
  async isSignedIn(): Promise<boolean> {
    if (!GoogleSignin) {
      return false;
    }

    try {
      const userInfo = await GoogleSignin.getCurrentUser();
      return userInfo !== null;
    } catch (error) {
      console.error('Error checking sign-in status:', error);
      return false;
    }
  }

  // Sign out user
  async signOut(): Promise<void> {
    if (!GoogleSignin) {
      return;
    }

    try {
      await GoogleSignin.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  // Save tokens to user profile
  private async saveTokensToProfile(tokens: GoogleCalendarTokens): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

      const { error } = await supabase
        .from('profiles')
        .update({
          google_calendar_access_token: tokens.access_token,
          google_calendar_refresh_token: tokens.refresh_token,
          google_calendar_token_expires_at: expiresAt.toISOString(),
          google_calendar_connected: true,
        })
        .eq('id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving tokens:', error);
      throw error;
    }
  }

  // Get valid access token (refresh if needed)
  async getValidAccessToken(): Promise<string | null> {
    if (!GoogleSignin) {
      return null;
    }

    try {
      // Check if user is signed in with Google
      const userInfo = await GoogleSignin.getCurrentUser();
      if (!userInfo) return null;

      // Get fresh tokens from Google Sign-In
      const tokens = await GoogleSignin.getTokens();
      
      if (tokens.accessToken) {
        // Update tokens in database
        const googleTokens: GoogleCalendarTokens = {
          access_token: tokens.accessToken,
          refresh_token: undefined, // Google Sign-In handles refresh automatically
          expires_in: 3600,
          token_type: 'Bearer',
        };
        
        await this.saveTokensToProfile(googleTokens);
        return tokens.accessToken;
      }

      return null;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  // Refresh tokens using Google Sign-In (handled automatically)
  private async refreshTokens(): Promise<string | null> {
    if (!GoogleSignin) {
      return null;
    }

    try {
      // Google Sign-In handles token refresh automatically
      const tokens = await GoogleSignin.getTokens();
      
      if (tokens.accessToken) {
        const googleTokens: GoogleCalendarTokens = {
          access_token: tokens.accessToken,
          refresh_token: undefined,
          expires_in: 3600,
          token_type: 'Bearer',
        };
        
        await this.saveTokensToProfile(googleTokens);
        return tokens.accessToken;
      }
      
      return null;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  // Create calendar event
  async createEvent(event: CalendarEvent, calendarId: string = 'primary'): Promise<string | null> {
    try {
      const accessToken = await this.getValidAccessToken();
      if (!accessToken) throw new Error('No valid access token');

      const response = await fetch(`${this.baseURL}/calendars/${calendarId}/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create event: ${errorData.error?.message || 'Unknown error'}`);
      }

      const createdEvent = await response.json();
      return createdEvent.id;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  // Update calendar event
  async updateEvent(eventId: string, event: Partial<CalendarEvent>, calendarId: string = 'primary'): Promise<void> {
    try {
      const accessToken = await this.getValidAccessToken();
      if (!accessToken) throw new Error('No valid access token');

      const response = await fetch(`${this.baseURL}/calendars/${calendarId}/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to update event: ${errorData.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  // Delete calendar event
  async deleteEvent(eventId: string, calendarId: string = 'primary'): Promise<void> {
    try {
      const accessToken = await this.getValidAccessToken();
      if (!accessToken) throw new Error('No valid access token');

      const response = await fetch(`${this.baseURL}/calendars/${calendarId}/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok && response.status !== 404) {
        const errorData = await response.json();
        throw new Error(`Failed to delete event: ${errorData.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  // Check if user is connected to Google Calendar
  async isConnected(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: profile } = await supabase
        .from('profiles')
        .select('google_calendar_connected')
        .eq('id', user.id)
        .single();

      return profile?.google_calendar_connected || false;
    } catch (error) {
      console.error('Error checking connection status:', error);
      return false;
    }
  }

  // Disconnect Google Calendar
  async disconnect(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Revoke Google tokens
      const accessToken = await this.getValidAccessToken();
      if (accessToken) {
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
            method: 'POST',
          });
        } catch (error) {
          console.warn('Failed to revoke Google token:', error);
        }
      }

      // Clear tokens from database
      const { error } = await supabase
        .from('profiles')
        .update({
          google_calendar_access_token: null,
          google_calendar_refresh_token: null,
          google_calendar_token_expires_at: null,
          google_calendar_connected: false,
        })
        .eq('id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      throw error;
    }
  }

  // Add booking to calendar
  async addBookingToCalendar(booking: any, userRole: 'client' | 'trainer'): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Get trainer and client info
      const { data: trainer } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', booking.trainer_id)
        .single();

      const { data: client } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', booking.client_id)
        .single();

      if (!trainer || !client) throw new Error('Failed to get booking participants');

      // Create event details
      const startDateTime = new Date(`${booking.date}T${booking.start_time}`);
      const endDateTime = new Date(`${booking.date}T${booking.end_time}`);

      const event: CalendarEvent = {
        summary: `Training Session - ${userRole === 'client' ? trainer.name : client.name}`,
        description: `Training session between ${trainer.name} (Trainer) and ${client.name} (Client)${booking.client_notes ? `\n\nClient Notes: ${booking.client_notes}` : ''}`,
        start: {
          dateTime: startDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDateTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        attendees: [
          { email: trainer.email, displayName: trainer.name },
          { email: client.email, displayName: client.name },
        ],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 15 },
            { method: 'email', minutes: 60 },
          ],
        },
      };

      const eventId = await this.createEvent(event);
      
      if (eventId) {
        // Save event to database
        await supabase
          .from('calendar_events')
          .insert({
            booking_id: booking.id,
            user_id: user.id,
            google_event_id: eventId,
          });

        // Update booking to mark calendar as added
        const updateField = userRole === 'client' ? 'calendar_added_by_client' : 'calendar_added_by_trainer';
        await supabase
          .from('bookings')
          .update({ [updateField]: true })
          .eq('id', booking.id);
      }

      return eventId;
    } catch (error) {
      console.error('Error adding booking to calendar:', error);
      throw error;
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
