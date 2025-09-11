# GYM Booking App with Google Calendar Integration

A comprehensive gym booking application built with React Native, Expo, and Supabase, featuring Google Calendar integration for seamless session management.

## Features

- **User Authentication**: Secure login/signup for trainers and clients
- **Booking System**: Clients can book sessions with trainers
- **Real-time Notifications**: Push notifications for booking updates
- **Google Calendar Integration**: Add confirmed sessions to Google Calendar
- **Payment Management**: Handle payment requests between trainers and clients
- **Availability Management**: Trainers can set their available hours

## Tech Stack

- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Calendar**: Google Calendar API
- **Notifications**: Expo Notifications
- **State Management**: React Context
- **Navigation**: Expo Router

## Prerequisites

- Node.js (v18 or higher)
- Expo CLI
- Google Cloud Console account
- Supabase account

## Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gym2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
   EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=your_google_client_secret
   EXPO_PUBLIC_SCHEME=gym2
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

## Google Calendar Integration Setup

### 1. Google Cloud Console Setup

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Note your project ID

2. **Enable Google Calendar API**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Configure the OAuth consent screen first if prompted
   - Select "Application type" as "Web application"
   - Add authorized redirect URIs:
     - For development: `https://auth.expo.io/@your-expo-username/gym2`
     - For production: `https://auth.expo.io/@your-expo-username/gymupdated`

4. **Configure OAuth Consent Screen**
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" user type
   - Fill in required fields:
     - App name: "GYM Booking App"
     - User support email: your email
     - Developer contact information: your email
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
   - Add test users (for development)

### 2. Supabase Database Setup

Run the following SQL migrations in your Supabase SQL editor:

```sql
-- Add Google Calendar auth info to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_calendar_access_token text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_calendar_refresh_token text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_calendar_token_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_calendar_connected boolean DEFAULT false;

-- Add calendar event ID to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS google_calendar_event_id text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS calendar_added_by_client boolean DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS calendar_added_by_trainer boolean DEFAULT false;

-- Create table for storing Google Calendar events
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  google_event_id text NOT NULL,
  calendar_id text DEFAULT 'primary',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for calendar_events
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- Calendar events policies
CREATE POLICY "Users can view own calendar events" ON calendar_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own calendar events" ON calendar_events
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_booking_id ON calendar_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_google_calendar_event_id ON bookings(google_calendar_event_id);
```

## Production Deployment

### 1. Environment Variables for Production

Update your production environment with:

```env
EXPO_PUBLIC_SUPABASE_URL=your_production_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_production_google_client_id
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=your_production_google_client_secret
EXPO_PUBLIC_SCHEME=gym2
```

### 2. Google OAuth Configuration for Production

1. **Update OAuth Redirect URIs**
   - Add your production app's redirect URI
   - For Expo managed workflow: `https://auth.expo.io/@your-expo-username/gymupdated`
   - For standalone apps: `your-app-scheme://redirect`

2. **Publish OAuth Consent Screen**
   - Go to OAuth consent screen in Google Cloud Console
   - Change publishing status from "Testing" to "In production"
   - This requires verification if you're requesting sensitive scopes

3. **Domain Verification** (if required)
   - Add and verify your domain in Google Search Console
   - Add verified domains to OAuth consent screen

### 3. App Store Deployment

1. **iOS App Store**
   - Add URL scheme in `app.json`: `"scheme": "gym2"`
   - Configure associated domains if needed
   - Update Google OAuth redirect URI to match your app's scheme

2. **Google Play Store**
   - Configure intent filters for deep linking
   - Add SHA-1 fingerprint to Google Cloud Console
   - Update OAuth redirect URI accordingly

### 4. Security Considerations

1. **API Keys**
   - Never commit API keys to version control
   - Use environment variables for all sensitive data
   - Rotate keys regularly

2. **OAuth Scopes**
   - Request minimal necessary scopes
   - Clearly explain to users why calendar access is needed

3. **Token Management**
   - Tokens are stored securely in Supabase
   - Implement proper token refresh logic
   - Handle token revocation gracefully

## Usage

### For Users

1. **Connect Google Calendar**
   - Go to Account/Settings
   - Click "Connect Google Calendar"
   - Authorize the app to access your calendar

2. **Add Sessions to Calendar**
   - When a booking is confirmed, an "Add to Calendar" button appears
   - Click to add the session to your Google Calendar
   - Both trainers and clients can add sessions independently

### For Developers

1. **Testing Calendar Integration**
   ```bash
   # Run the app in development
   npm run dev
   
   # Test OAuth flow
   # - Connect calendar in app settings
   # - Create and confirm a booking
   # - Test "Add to Calendar" functionality
   ```

2. **Debugging**
   - Check console logs for OAuth errors
   - Verify redirect URIs match exactly
   - Ensure Google Calendar API is enabled
   - Check token expiration and refresh logic

## API Endpoints

The app uses the following Google Calendar API endpoints:

- `POST https://oauth2.googleapis.com/token` - Token exchange/refresh
- `GET https://www.googleapis.com/calendar/v3/calendars/primary/events` - List events
- `POST https://www.googleapis.com/calendar/v3/calendars/primary/events` - Create event
- `PATCH https://www.googleapis.com/calendar/v3/calendars/primary/events/{eventId}` - Update event
- `DELETE https://www.googleapis.com/calendar/v3/calendars/primary/events/{eventId}` - Delete event

## Troubleshooting

### Common Issues

1. **OAuth Error: redirect_uri_mismatch**
   - Ensure redirect URI in Google Cloud Console matches exactly
   - Check for trailing slashes or case sensitivity

2. **Calendar API Quota Exceeded**
   - Google Calendar API has usage limits
   - Implement exponential backoff for retries
   - Consider caching calendar data

3. **Token Refresh Failures**
   - Check if refresh token is properly stored
   - Verify client credentials are correct
   - Handle token revocation by re-authenticating

4. **Deep Link Issues**
   - Ensure app scheme matches in `app.json` and Google OAuth
   - Test deep links on physical devices
   - Check URL scheme registration

### Debug Commands

```bash
# Check environment variables
npx expo config

# Clear Expo cache
npx expo start --clear

# Check bundle identifier
npx expo config --type introspect
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Check the troubleshooting section
- Review Google Calendar API documentation
- Check Expo documentation for OAuth flows
- Create an issue in the repository
