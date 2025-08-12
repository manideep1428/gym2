import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Example showing the improved availability management

export const EasyAvailabilityManagementExample = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Easy Availability Management</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Moved to Settings Tab</Text>
        <Text style={styles.step}>• Removed "Schedule" from main tabs</Text>
        <Text style={styles.step}>• Integrated into Settings screen</Text>
        <Text style={styles.step}>• Less cluttered navigation</Text>
        <Text style={styles.step}>• More intuitive location</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Simplified Interface</Text>
        <Text style={styles.step}>• Compact availability display in settings</Text>
        <Text style={styles.step}>• Shows only days with availability</Text>
        <Text style={styles.step}>• Quick + button to add new slots</Text>
        <Text style={styles.step}>• Easy delete with trash icon</Text>
        <Text style={styles.step}>• Clean, minimal design</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚀 Quick Setup Modal</Text>
        <Text style={styles.step}>• Modal popup for adding availability</Text>
        <Text style={styles.step}>• Day selector with abbreviated names</Text>
        <Text style={styles.step}>• Time range selection</Text>
        <Text style={styles.step}>• Quick preset buttons:</Text>
        <Text style={styles.substep}>   • Morning: 6 AM - 12 PM</Text>
        <Text style={styles.substep}>   • Afternoon: 12 PM - 6 PM</Text>
        <Text style={styles.substep}>   • Evening: 6 PM - 10 PM</Text>
        <Text style={styles.substep}>   • Full Day: 8 AM - 8 PM</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 User Experience</Text>
        <Text style={styles.step}>• Empty state with helpful message</Text>
        <Text style={styles.step}>• Visual feedback with icons</Text>
        <Text style={styles.step}>• Grouped by day of week</Text>
        <Text style={styles.step}>• 12-hour time format display</Text>
        <Text style={styles.step}>• Confirmation dialogs for deletion</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔧 How It Works</Text>
        <Text style={styles.step}>1. Trainer goes to Settings tab</Text>
        <Text style={styles.step}>2. Sees "My Availability" section</Text>
        <Text style={styles.step}>3. Clicks + button to add availability</Text>
        <Text style={styles.step}>4. Selects day (Mon, Tue, Wed...)</Text>
        <Text style={styles.step}>5. Chooses preset or custom time range</Text>
        <Text style={styles.step}>6. Clicks "Add Availability"</Text>
        <Text style={styles.step}>7. Availability appears in settings</Text>
        <Text style={styles.step}>8. Can delete with trash icon</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✨ Benefits</Text>
        <Text style={styles.step}>✅ Fewer tabs = cleaner navigation</Text>
        <Text style={styles.step}>✅ Settings is logical place for availability</Text>
        <Text style={styles.step}>✅ Quick preset buttons save time</Text>
        <Text style={styles.step}>✅ Modal keeps main screen uncluttered</Text>
        <Text style={styles.step}>✅ Easy to add multiple time slots</Text>
        <Text style={styles.step}>✅ Visual feedback for empty state</Text>
        <Text style={styles.step}>✅ Consistent with app design patterns</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Example Setup</Text>
        <Text style={styles.step}>Monday: 9:00 AM - 5:00 PM</Text>
        <Text style={styles.step}>Tuesday: 6:00 AM - 12:00 PM, 2:00 PM - 8:00 PM</Text>
        <Text style={styles.step}>Wednesday: 10:00 AM - 6:00 PM</Text>
        <Text style={styles.step}>Thursday: 8:00 AM - 4:00 PM</Text>
        <Text style={styles.step}>Friday: 12:00 PM - 10:00 PM</Text>
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
  substep: {
    fontSize: 13,
    marginBottom: 5,
    marginLeft: 20,
    color: '#666',
  },
});