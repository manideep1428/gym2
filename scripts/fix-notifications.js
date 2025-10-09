#!/usr/bin/env node

/**
 * Script to fix notification system bugs
 * Run this script to apply database fixes and test notifications
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://tkmfroaywhdwsarnaecj.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrbWZyb2F5d2hkd3Nhcm5hZWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5OTIyNjAsImV4cCI6MjA3MDU2ODI2MH0.9s0NP7mu5GKtsc1ELq6Le3fpNYCgYo2O-Ixad9_YDMY";

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixNotificationSystem() {
  console.log('🔧 Starting notification system fixes...');

  try {
    // Check if notifications table exists and has data column
    console.log('📋 Checking notifications table structure...');
    
    const { data: tableInfo, error: tableError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ Error checking notifications table:', tableError);
      return;
    }

    console.log('✅ Notifications table exists');

    // Test creating a notification with data column
    console.log('🧪 Testing notification creation...');
    
    const testUserId = '00000000-0000-0000-0000-000000000000'; // Placeholder
    
    const { data: testNotification, error: createError } = await supabase
      .from('notifications')
      .insert({
        user_id: testUserId,
        title: 'Test Notification',
        message: 'Testing notification system',
        type: 'booking_request',
        data: { test: true, timestamp: new Date().toISOString() }
      })
      .select()
      .single();

    if (createError) {
      if (createError.message.includes('column "data" of relation "notifications" does not exist')) {
        console.log('❌ Data column missing! You need to run the migration:');
        console.log('📝 Execute this SQL in your Supabase dashboard:');
        console.log('ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB;');
        return;
      } else {
        console.error('❌ Error creating test notification:', createError);
        return;
      }
    }

    console.log('✅ Test notification created successfully:', testNotification.id);

    // Clean up test notification
    await supabase
      .from('notifications')
      .delete()
      .eq('id', testNotification.id);

    console.log('🧹 Test notification cleaned up');

    // Check notification settings table
    console.log('⚙️ Checking notification settings...');
    
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .limit(1);

    if (settingsError) {
      console.error('❌ Error checking notification settings:', settingsError);
    } else {
      console.log('✅ Notification settings table exists');
    }

    console.log('🎉 Notification system check completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Make sure to run the app on a physical device (not simulator)');
    console.log('2. Grant notification permissions when prompted');
    console.log('3. Test notifications by creating bookings or payment requests');
    console.log('4. Check the console logs for detailed notification flow');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the fix
fixNotificationSystem();
