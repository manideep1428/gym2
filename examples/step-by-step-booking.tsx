import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Example showing the new step-by-step booking flow

export const StepByStepBookingExample = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Step-by-Step Booking Flow</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 1: Calendar Date Selection</Text>
        <Text style={styles.step}>• Shows a proper calendar view (3 weeks)</Text>
        <Text style={styles.step}>• Available dates: Full color, clickable</Text>
        <Text style={styles.step}>• Unavailable dates: Translucent (opacity 0.3), disabled</Text>
        <Text style={styles.step}>• Selected date: Primary color background</Text>
        <Text style={styles.step}>• Progress indicator shows current step (1/4)</Text>
        <Text style={styles.step}>• "Next: Select Duration" button appears after selection</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 2: Duration Selection</Text>
        <Text style={styles.step}>• Shows selected date at top</Text>
        <Text style={styles.step}>• Back button to return to date selection</Text>
        <Text style={styles.step}>• Duration cards: 30, 60, 90, 120 minutes</Text>
        <Text style={styles.step}>• Custom duration option with text input</Text>
        <Text style={styles.step}>• Visual cards with clock icons</Text>
        <Text style={styles.step}>• "Next: Select Time" button appears after selection</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 3: Time Selection</Text>
        <Text style={styles.step}>• Shows selected date + duration at top</Text>
        <Text style={styles.step}>• Back button to return to duration selection</Text>
        <Text style={styles.step}>• Time slots filtered by availability AND duration</Text>
        <Text style={styles.step}>• Only shows times where full session fits in availability</Text>
        <Text style={styles.step}>• Available times: Full color, clickable</Text>
        <Text style={styles.step}>• Unavailable times: Translucent (opacity 0.4), disabled</Text>
        <Text style={styles.step}>• "Next: Add Notes" button appears after selection</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 4: Notes & Confirmation</Text>
        <Text style={styles.step}>• Booking summary card with all details</Text>
        <Text style={styles.step}>• Optional notes text area</Text>
        <Text style={styles.step}>• "Request Session" button to submit</Text>
        <Text style={styles.step}>• "Start Over" button to reset all selections</Text>
        <Text style={styles.step}>• Back button to return to time selection</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Improvements</Text>
        <Text style={styles.step}>✅ Calendar view instead of horizontal scroll</Text>
        <Text style={styles.step}>✅ Step-by-step guided flow</Text>
        <Text style={styles.step}>✅ Custom duration option</Text>
        <Text style={styles.step}>✅ Duration-aware time filtering</Text>
        <Text style={styles.step}>✅ Progress indicator</Text>
        <Text style={styles.step}>✅ Back navigation between steps</Text>
        <Text style={styles.step}>✅ Booking summary before confirmation</Text>
        <Text style={styles.step}>✅ Better visual feedback</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Custom Duration Examples</Text>
        <Text style={styles.step}>• 45 minutes for focused sessions</Text>
        <Text style={styles.step}>• 75 minutes for extended workouts</Text>
        <Text style={styles.step}>• 105 minutes for comprehensive training</Text>
        <Text style={styles.step}>• Any duration between 15-180 minutes</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Smart Time Filtering</Text>
        <Text style={styles.step}>• If trainer available 9 AM - 12 PM (3 hours)</Text>
        <Text style={styles.step}>• 60-min session: Shows 9:00, 9:30, 10:00, 10:30, 11:00</Text>
        <Text style={styles.step}>• 90-min session: Shows 9:00, 9:30, 10:00, 10:30</Text>
        <Text style={styles.step}>• 120-min session: Shows 9:00, 9:30, 10:00</Text>
        <Text style={styles.step}>• Ensures full session fits within availability</Text>
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