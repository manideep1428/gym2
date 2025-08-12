import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Example showing the smart booking system with conflict handling

export const SmartBookingSystemExample = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart Booking System with Conflict Handling</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Smart Time Slot Generation</Text>
        <Text style={styles.step}>• User selects date → fetches trainer availability</Text>
        <Text style={styles.step}>• User selects duration (30, 60, 90, 120, or custom)</Text>
        <Text style={styles.step}>• System generates 15-minute interval slots</Text>
        <Text style={styles.step}>• Only shows slots where FULL session fits in availability</Text>
        <Text style={styles.step}>• Excludes slots that overlap with confirmed bookings</Text>
        <Text style={styles.step}>• Shows pending requests with "Requested" indicator</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Example: Trainer Available 9 AM - 1 PM</Text>
        <Text style={styles.step}>• Existing booking: 10:00 AM - 11:00 AM (confirmed)</Text>
        <Text style={styles.step}>• Pending request: 11:30 AM - 12:30 PM</Text>
        <Text style={styles.step}>• User selects 90-minute session</Text>
        <Text style={styles.step}>• Available slots shown:</Text>
        <Text style={styles.substep}>   ✅ 9:00 AM (ends 10:30 AM - fits before existing)</Text>
        <Text style={styles.substep}>   ❌ 9:15 AM (ends 10:45 AM - overlaps existing)</Text>
        <Text style={styles.substep}>   ❌ 10:00 AM (overlaps existing booking)</Text>
        <Text style={styles.substep}>   ⚠️ 11:30 AM (pending request - shows "Requested")</Text>
        <Text style={styles.substep}>   ✅ 11:45 AM (ends 1:15 PM - but cuts off at 1 PM)</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Multiple Requests Allowed</Text>
        <Text style={styles.step}>• Multiple clients can request same time slot</Text>
        <Text style={styles.step}>• System shows "Requested" indicator on contested slots</Text>
        <Text style={styles.step}>• All requests go to trainer as "pending"</Text>
        <Text style={styles.step}>• Trainer sees all requests and chooses who to confirm</Text>
        <Text style={styles.step}>• Info message: "Multiple clients can request the same time slot"</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Auto-Conflict Resolution</Text>
        <Text style={styles.step}>• When trainer confirms a booking:</Text>
        <Text style={styles.substep}>   1. System finds all pending bookings for same date</Text>
        <Text style={styles.substep}>   2. Checks for time overlaps with confirmed booking</Text>
        <Text style={styles.substep}>   3. Auto-cancels conflicting pending requests</Text>
        <Text style={styles.substep}>   4. Sends notifications to affected clients</Text>
        <Text style={styles.step}>• Confirmed client gets: "Booking Confirmed" notification</Text>
        <Text style={styles.step}>• Rejected clients get: "Booking Cancelled" notification</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Conflict Detection Logic</Text>
        <Text style={styles.step}>• Confirmed: 2:00 PM - 3:30 PM (90 min)</Text>
        <Text style={styles.step}>• Pending A: 1:30 PM - 2:30 PM → CANCELLED (overlaps)</Text>
        <Text style={styles.step}>• Pending B: 3:00 PM - 4:00 PM → CANCELLED (overlaps)</Text>
        <Text style={styles.step}>• Pending C: 4:00 PM - 5:00 PM → KEPT (no overlap)</Text>
        <Text style={styles.step}>• Uses precise time overlap calculation</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. User Experience Improvements</Text>
        <Text style={styles.step}>✅ No more 30-minute fixed intervals</Text>
        <Text style={styles.step}>✅ Duration-aware slot generation</Text>
        <Text style={styles.step}>✅ Visual indicators for contested slots</Text>
        <Text style={styles.step}>✅ Clear messaging about multiple requests</Text>
        <Text style={styles.step}>✅ Automatic conflict resolution</Text>
        <Text style={styles.step}>✅ Comprehensive notifications</Text>
        <Text style={styles.step}>✅ No gaps between existing bookings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7. Edge Cases Handled</Text>
        <Text style={styles.step}>• 30-min gap between bookings + 60-min request = blocked</Text>
        <Text style={styles.step}>• Custom duration (e.g., 45 min) properly calculated</Text>
        <Text style={styles.step}>• Multiple overlapping requests handled gracefully</Text>
        <Text style={styles.step}>• Trainer availability changes reflected immediately</Text>
        <Text style={styles.step}>• Session end time can't exceed availability window</Text>
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
  substep: {
    fontSize: 13,
    marginBottom: 5,
    marginLeft: 20,
    color: '#666',
  },
});