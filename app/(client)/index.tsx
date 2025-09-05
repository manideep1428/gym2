import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Calendar, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function ClientHome() {
  const { colors } = useTheme();
  const { userProfile } = useAuth();
  const router = useRouter();

  const styles = createStyles(colors);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: colors.text }]}>
            Hello {userProfile?.name}!
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Ready to achieve your fitness goals?
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={() => router.push('/(client)/trainer-search')}
        >
          <Search color={colors.primary} size={24} />
        </TouchableOpacity>
      </View>

      {/* Book Session Card */}
      <View style={styles.content}>
        <Pressable 
          style={({ pressed }) => [
            styles.bookSessionCard, 
            { backgroundColor: colors.primary },
            pressed && styles.cardPressed
          ]}
          onPress={() => router.push('/(client)/trainer-search')}
          android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
        >
          <View style={styles.cardContent}>
            <View style={styles.iconContainer}>
              <Calendar color="#FFFFFF" size={16} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>Book a Session</Text>
              <Text style={styles.cardSubtitle}>Find and book with top trainers</Text>
            </View>
          </View>
        </Pressable>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          
          <View style={styles.actionsGrid}>
            <Pressable 
              style={({ pressed }) => [
                styles.actionCard, 
                { backgroundColor: colors.card, borderColor: colors.border },
                pressed && styles.actionCardPressed
              ]}
              onPress={() => router.push('/(client)/trainer-search')}
              android_ripple={{ color: colors.primary + '20' }}
            >
              <Search color={colors.primary} size={24} />
              <Text style={[styles.actionText, { color: colors.text }]}>Find Trainers</Text>
            </Pressable>

            <Pressable 
              style={({ pressed }) => [
                styles.actionCard, 
                { backgroundColor: colors.card, borderColor: colors.border },
                pressed && styles.actionCardPressed
              ]}
              onPress={() => router.push('/(client)/bookings')}
              android_ripple={{ color: colors.primary + '20' }}
            >
              <Calendar color={colors.primary} size={24} />
              <Text style={[styles.actionText, { color: colors.text }]}>My Bookings</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  bookSessionCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  quickActions: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    minHeight: 100,
    justifyContent: 'center',
  },
  actionCardPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});