import React from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut } from 'lucide-react-native';

// Example of how the updated signOut function works
export const SignOutExample = () => {
  const { signOut, userProfile } = useAuth();

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await signOut();
              // No need to manually navigate - signOut function handles it
              // User will be automatically redirected to /auth/register
            } catch (error: any) {
              Alert.alert('Error', 'Failed to sign out: ' + error.message);
            }
          }
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Current User</Text>
      <Text style={styles.userInfo}>Name: {userProfile?.name}</Text>
      <Text style={styles.userInfo}>Role: {userProfile?.role}</Text>
      <Text style={styles.userInfo}>Email: {userProfile?.email}</Text>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
      >
        <LogOut color="#FF3B30" size={20} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        When you sign out, you'll be automatically redirected to the register screen.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  userInfo: {
    fontSize: 16,
    marginBottom: 10,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FF3B3010',
    borderColor: '#FF3B30',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 30,
    marginBottom: 20,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF3B30',
  },
  note: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});