import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Google Calendar API configuration
// These should be loaded from environment variables in production
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "446928845689-b6ml0pbcdv0a0cq05mqter9099pumlji.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || "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";
const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: process.env.EXPO_PUBLIC_SCHEME || "gym2",
  path: "redirect",
});

const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

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

  // Initialize Google OAuth
  async authenticateWithGoogle(): Promise<GoogleCalendarTokens | null> {
    try {
      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        scopes: GOOGLE_CALENDAR_SCOPES,
        redirectUri: REDIRECT_URI,
        responseType: AuthSession.ResponseType.Code,
        extraParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      });

      const result = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      });

      if (result.type === 'success' && result.params.code) {
        return await this.exchangeCodeForTokens(result.params.code);
      }

      return null;
    } catch (error) {
      console.error('Google Calendar authentication error:', error);
      throw new Error('Failed to authenticate with Google Calendar');
    }
  }

  // Exchange authorization code for tokens
  private async exchangeCodeForTokens(code: string): Promise<GoogleCalendarTokens> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: REDIRECT_URI,
        }).toString(),
      });

      if (!response.ok) {
        throw new Error('Failed to exchange code for tokens');
      }

      const tokens = await response.json();
      await this.saveTokensToProfile(tokens);
      return tokens;
    } catch (error) {
      console.error('Token exchange error:', error);
      throw error;
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('google_calendar_access_token, google_calendar_refresh_token, google_calendar_token_expires_at, google_calendar_connected')
        .eq('id', user.id)
        .single();

      if (error || !profile?.google_calendar_connected) return null;

      // Check if token is expired
      const expiresAt = new Date(profile.google_calendar_token_expires_at);
      const now = new Date();

      if (now >= expiresAt && profile.google_calendar_refresh_token) {
        // Refresh token
        const newTokens = await this.refreshAccessToken(profile.google_calendar_refresh_token);
        return newTokens.access_token;
      }

      return profile.google_calendar_access_token;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  // Refresh access token
  private async refreshAccessToken(refreshToken: string): Promise<GoogleCalendarTokens> {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const tokens = await response.json();
      await this.saveTokensToProfile(tokens);
      return tokens;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
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
