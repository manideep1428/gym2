import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Example showing how availability-based booking works

export const AvailabilityBookingExample = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Availability-Based Booking System</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Trainer Sets Availability</Text>
        <Text style={styles.step}>• Trainer goes to Availability tab</Text>
        <Text style={styles.step}>• Clicks + button to add availability</Text>
        <Text style={styles.step}>• Selects day of week (Monday, Tuesday, etc.)</Text>
        <Text style={styles.step}>• Sets time range (e.g., 9:00 AM - 5:00 PM)</Text>
        <Text style={styles.step}>• Saves recurring availability for that day</Text>
        <Text style={styles.step}>• Can add multiple time slots per day</Text>
        <Text style={styles.step}>• Can delete availability slots anytime</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Client Booking Experience</Text>
        <Text style={styles.step}>• Client selects trainer and clicks "Book Session"</Text>
        <Text style={styles.step}>• Date selection shows next 14 days</Text>
        <Text style={styles.step}>• Available dates: Normal appearance</Text>
        <Text style={styles.step}>• Unavailable dates: Translucent/disabled (opacity 0.5)</Text>
        <Text style={styles.step}>• Client can only click on available dates</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Time Slot Filtering</Text>
        <Text style={styles.step}>• After selecting date, time slots appear</Text>
        <Text style={styles.step}>• Available times: Normal appearance</Text>
        <Text style={styles.step}>• Unavailable times: Translucent/disabled (opacity 0.4)</Text>
        <Text style={styles.step}>• Only shows times within trainer's availability</Text>
        <Text style={styles.step}>• Checks both recurring and specific date availability</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Booking Validation</Text>
        <Text style={styles.step}>• Verifies availability before booking</Text>
        <Text style={styles.step}>• Checks for existing bookings at same time</Text>
        <Text style={styles.step}>• Prevents double-booking</Text>
        <Text style={styles.step}>• Shows error if time becomes unavailable</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Visual Indicators</Text>
        <Text style={styles.step}>• Available: Full color, clickable</Text>
        <Text style={styles.step}>• Unavailable: Translucent background + disabled</Text>
        <Text style={styles.step}>• Selected: Primary color background</Text>
        <Text style={styles.step}>• Error messages for unavailable selections</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. Example Availability Setup</Text>
        <Text style={styles.step}>Monday: 9:00 AM - 12:00 PM, 2:00 PM - 6:00 PM</Text>
        <Text style={styles.step}>Tuesday: Not available (no slots set)</Text>
        <Text style={styles.step}>Wednesday: 10:00 AM - 4:00 PM</Text>
        <Text style={styles.step}>Thursday: 8:00 AM - 12:00 PM</Text>
        <Text style={styles.step}>Friday: 1:00 PM - 8:00 PM</Text>
        <Text style={styles.step}>Weekend: Not available</Text>
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