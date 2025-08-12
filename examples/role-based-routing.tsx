import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Example showing how the role-based routing now works

export const RoleBasedRoutingExample = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Role-Based Routing Flow</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Registration Flow:</Text>
        <Text style={styles.step}>1. User selects role (client/trainer) on register screen</Text>
        <Text style={styles.step}>2. User fills form and submits</Text>
        <Text style={styles.step}>3. signUp() creates auth user and profile with selected role</Text>
        <Text style={styles.step}>4. Profile is immediately set in context</Text>
        <Text style={styles.step}>5. Register screen routes directly based on selected role:</Text>
        <Text style={styles.substep}>   • Trainer → /(trainer)</Text>
        <Text style={styles.substep}>   • Client → /(client)</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Login Flow:</Text>
        <Text style={styles.step}>1. User enters credentials</Text>
        <Text style={styles.step}>2. signIn() authenticates and fetches profile</Text>
        <Text style={styles.step}>3. Login screen routes to '/' (index.tsx)</Text>
        <Text style={styles.step}>4. Index.tsx checks userProfile.role and routes:</Text>
        <Text style={styles.substep}>   • Trainer → /(trainer)</Text>
        <Text style={styles.substep}>   • Client → /(client)</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SignOut Flow:</Text>
        <Text style={styles.step}>1. User clicks sign out</Text>
        <Text style={styles.step}>2. signOut() clears session and routes to /auth/register</Text>
        <Text style={styles.step}>3. User can register again with any role</Text>
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
  },
  section: {
    marginBottom: 25,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#007AFF',
  },
  step: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
  substep: {
    fontSize: 14,
    marginBottom: 5,
    marginLeft: 20,
    color: '#666',
  },
});