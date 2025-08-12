import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Example showing the complete booking flow

export const BookingFlowExample = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Complete Booking Flow</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Client Side - Finding & Booking Trainers</Text>
        <Text style={styles.step}>• Client opens app → goes to Home tab</Text>
        <Text style={styles.step}>• Sees list of available trainers with ratings & specializations</Text>
        <Text style={styles.step}>• Taps on trainer card → opens trainer profile modal</Text>
        <Text style={styles.step}>• Views trainer details, packages, and bio</Text>
        <Text style={styles.step}>• Clicks "Book Session" → navigates to booking screen</Text>
        <Text style={styles.step}>• Selects date, time, duration, and adds notes</Text>
        <Text style={styles.step}>• Clicks "Request Session" → booking created with status 'pending'</Text>
        <Text style={styles.step}>• Notification sent to trainer about new booking request</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Trainer Side - Managing Bookings</Text>
        <Text style={styles.step}>• Trainer receives notification about new booking request</Text>
        <Text style={styles.step}>• Goes to Bookings tab → sees pending booking requests</Text>
        <Text style={styles.step}>• Views client details, session time, and notes</Text>
        <Text style={styles.step}>• Can either "Confirm" or "Cancel" the booking</Text>
        <Text style={styles.step}>• When confirmed/cancelled → notification sent to client</Text>
        <Text style={styles.step}>• For confirmed bookings → can mark as "Complete" after session</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Notifications System</Text>
        <Text style={styles.step}>• Both clients and trainers have Notifications tab</Text>
        <Text style={styles.step}>• Real-time notifications for booking updates</Text>
        <Text style={styles.step}>• Unread notifications show with blue dot</Text>
        <Text style={styles.step}>• Tap notification to mark as read</Text>
        <Text style={styles.step}>• "Mark all read" button for bulk actions</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Booking Status Flow</Text>
        <Text style={styles.step}>• pending → confirmed → completed</Text>
        <Text style={styles.step}>• pending → cancelled</Text>
        <Text style={styles.step}>• Each status change triggers notifications</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Navigation Structure</Text>
        <Text style={styles.step}>Client tabs: Home | Bookings | Notifications | Packages | Progress | Account</Text>
        <Text style={styles.step}>Trainer tabs: Dashboard | Bookings | Clients | Packages | Availability | Payments | Settings</Text>
        <Text style={styles.step}>Hidden screens: book-session (client only)</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#007AFF',
  },
  section: {
    marginBottom: 25,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    color: '#007AFF',
  },
  step: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
    paddingLeft: 10,
  },
});