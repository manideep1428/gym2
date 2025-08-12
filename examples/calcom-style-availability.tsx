import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Example showing the Cal.com-style availability management

export const CalcomStyleAvailabilityExample = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cal.com-Style Availability Management</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Navigation Flow</Text>
        <Text style={styles.step}>1. Trainer goes to Settings tab</Text>
        <Text style={styles.step}>2. Clicks "Availability" option</Text>
        <Text style={styles.step}>3. Opens dedicated availability screen</Text>
        <Text style={styles.step}>4. Back button returns to settings</Text>
        <Text style={styles.step}>5. Clean separation of concerns</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Calendar View (Default)</Text>
        <Text style={styles.step}>• Monthly calendar grid layout</Text>
        <Text style={styles.step}>• Navigation arrows for prev/next month</Text>
        <Text style={styles.step}>• Days with availability show blue dot</Text>
        <Text style={styles.step}>• Available days highlighted in blue</Text>
        <Text style={styles.step}>• Today highlighted with border</Text>
        <Text style={styles.step}>• Click any date to add availability</Text>
        <Text style={styles.step}>• Legend shows available vs not set</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Weekly View (Alternative)</Text>
        <Text style={styles.step}>• Traditional day-by-day list</Text>
        <Text style={styles.step}>• Each day has + button to add slots</Text>
        <Text style={styles.step}>• Shows existing time ranges</Text>
        <Text style={styles.step}>• Delete button for each slot</Text>
        <Text style={styles.step}>• "No availability set" for empty days</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔄 View Toggle</Text>
        <Text style={styles.step}>• Toggle buttons: Calendar | Weekly</Text>
        <Text style={styles.step}>• Calendar view for visual overview</Text>
        <Text style={styles.step}>• Weekly view for detailed management</Text>
        <Text style={styles.step}>• Smooth switching between views</Text>
        <Text style={styles.step}>• State preserved when switching</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>➕ Adding Availability</Text>
        <Text style={styles.step}>• Click calendar date → opens modal</Text>
        <Text style={styles.step}>• Shows selected date at top</Text>
        <Text style={styles.step}>• Day selector (Sun, Mon, Tue...)</Text>
        <Text style={styles.step}>• Time range selection</Text>
        <Text style={styles.step}>• Quick preset buttons</Text>
        <Text style={styles.step}>• Add button creates recurring slot</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨 Visual Design</Text>
        <Text style={styles.step}>• Clean, minimal interface</Text>
        <Text style={styles.step}>• Consistent with Cal.com aesthetic</Text>
        <Text style={styles.step}>• Blue primary color for availability</Text>
        <Text style={styles.step}>• Subtle dots for availability indicators</Text>
        <Text style={styles.step}>• Card-based layout for sections</Text>
        <Text style={styles.step}>• Proper spacing and typography</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 User Experience</Text>
        <Text style={styles.step}>• Intuitive calendar interaction</Text>
        <Text style={styles.step}>• Visual feedback on hover/tap</Text>
        <Text style={styles.step}>• Clear availability indicators</Text>
        <Text style={styles.step}>• Easy month navigation</Text>
        <Text style={styles.step}>• Quick access to add availability</Text>
        <Text style={styles.step}>• Confirmation dialogs for deletion</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔧 Example Usage</Text>
        <Text style={styles.step}>1. Open Settings → Availability</Text>
        <Text style={styles.step}>2. See monthly calendar view</Text>
        <Text style={styles.step}>3. Click on Monday dates → Add 9 AM - 5 PM</Text>
        <Text style={styles.step}>4. Click on Tuesday dates → Add 6 AM - 12 PM</Text>
        <Text style={styles.step}>5. Switch to Weekly view to see all slots</Text>
        <Text style={styles.step}>6. Delete unwanted slots with trash icon</Text>
        <Text style={styles.step}>7. Calendar shows blue dots on available days</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✨ Key Benefits</Text>
        <Text style={styles.step}>✅ Familiar calendar interface</Text>
        <Text style={styles.step}>✅ Visual overview of availability</Text>
        <Text style={styles.step}>✅ Quick date-based setup</Text>
        <Text style={styles.step}>✅ Dual view modes for different needs</Text>
        <Text style={styles.step}>✅ Professional, clean design</Text>
        <Text style={styles.step}>✅ Intuitive interaction patterns</Text>
        <Text style={styles.step}>✅ Consistent with popular tools</Text>
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