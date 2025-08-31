import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4,
  style 
}) => {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.surface],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
};

// Trainer Dashboard Skeleton Components
export const TrainerStatCardSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <SkeletonLoader width={48} height={48} borderRadius={24} style={{ marginBottom: 12 }} />
      <SkeletonLoader width={40} height={24} borderRadius={4} style={{ marginBottom: 4 }} />
      <SkeletonLoader width={80} height={12} borderRadius={4} />
    </View>
  );
};

export const TrainerBookingCardSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.bookingInfo}>
        <SkeletonLoader width={120} height={16} borderRadius={4} style={{ marginBottom: 4 }} />
        <SkeletonLoader width={100} height={12} borderRadius={4} />
      </View>
      <SkeletonLoader width={60} height={24} borderRadius={12} />
    </View>
  );
};

export const TrainerActionCardSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <SkeletonLoader width={24} height={24} borderRadius={4} style={{ marginBottom: 8 }} />
      <SkeletonLoader width={70} height={12} borderRadius={4} />
    </View>
  );
};

// Client Dashboard Skeleton Components
export const ClientTrainerCardSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.trainerCard, { backgroundColor: colors.card }]}>
      <View style={styles.trainerImageContainer}>
        <SkeletonLoader width={80} height={80} borderRadius={40} />
      </View>
      <View style={styles.trainerInfo}>
        <SkeletonLoader width={100} height={16} borderRadius={4} style={{ marginBottom: 4 }} />
        <SkeletonLoader width={80} height={12} borderRadius={4} style={{ marginBottom: 6 }} />
        <SkeletonLoader width={120} height={12} borderRadius={4} style={{ marginBottom: 6 }} />
        <SkeletonLoader width={90} height={12} borderRadius={4} />
      </View>
    </View>
  );
};

// Complete Dashboard Skeletons
export const TrainerDashboardSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <SkeletonLoader width={200} height={28} borderRadius={4} style={{ marginBottom: 5 }} />
        <SkeletonLoader width={150} height={16} borderRadius={4} />
      </View>

      <View style={styles.content}>
        {/* Stats Grid Skeleton */}
        <View style={styles.statsGrid}>
          <TrainerStatCardSkeleton />
          <TrainerStatCardSkeleton />
          <TrainerStatCardSkeleton />
          <TrainerStatCardSkeleton />
        </View>

        {/* Recent Bookings Skeleton */}
        <View style={styles.section}>
          <SkeletonLoader width={140} height={18} borderRadius={4} style={{ marginBottom: 16 }} />
          <TrainerBookingCardSkeleton />
          <TrainerBookingCardSkeleton />
          <TrainerBookingCardSkeleton />
        </View>

        {/* Quick Actions Skeleton */}
        <View style={styles.section}>
          <SkeletonLoader width={120} height={18} borderRadius={4} style={{ marginBottom: 16 }} />
          <View style={styles.actionsGrid}>
            <TrainerActionCardSkeleton />
            <TrainerActionCardSkeleton />
            <TrainerActionCardSkeleton />
            <TrainerActionCardSkeleton />
            <TrainerActionCardSkeleton />
          </View>
        </View>
      </View>
    </View>
  );
};

export const ClientDashboardSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <SkeletonLoader width={180} height={28} borderRadius={4} style={{ marginBottom: 5 }} />
        <SkeletonLoader width={140} height={16} borderRadius={4} />
      </View>

      {/* Search Bar Skeleton */}
      <View style={styles.searchContainer}>
        <SkeletonLoader width="100%" height={48} borderRadius={12} />
      </View>

      {/* Trainers Grid Skeleton */}
      <View style={styles.trainersList}>
        <View style={styles.trainersRow}>
          <ClientTrainerCardSkeleton />
          <ClientTrainerCardSkeleton />
        </View>
        <View style={styles.trainersRow}>
          <ClientTrainerCardSkeleton />
          <ClientTrainerCardSkeleton />
        </View>
        <View style={styles.trainersRow}>
          <ClientTrainerCardSkeleton />
          <ClientTrainerCardSkeleton />
        </View>
      </View>
    </View>
  );
};

// Progress Page Skeleton Components
export const ProgressCardSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.progressHeader}>
        <SkeletonLoader width={120} height={16} borderRadius={4} />
        <SkeletonLoader width={80} height={12} borderRadius={4} />
      </View>
      <SkeletonLoader width="100%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="80%" height={12} borderRadius={4} style={{ marginBottom: 12 }} />
      <View style={styles.measurementRow}>
        <SkeletonLoader width={80} height={12} borderRadius={4} />
        <SkeletonLoader width={90} height={12} borderRadius={4} />
      </View>
    </View>
  );
};

export const ClientProgressSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.progressHeader}>
        <View style={styles.headerContent}>
          <SkeletonLoader width={140} height={28} borderRadius={4} style={{ marginBottom: 5 }} />
          <SkeletonLoader width={160} height={16} borderRadius={4} />
        </View>
        <SkeletonLoader width={44} height={44} borderRadius={22} />
      </View>

      <View style={styles.progressList}>
        <ProgressCardSkeleton />
        <ProgressCardSkeleton />
        <ProgressCardSkeleton />
        <ProgressCardSkeleton />
      </View>
    </View>
  );
};

// Bookings Page Skeleton Components
export const BookingCardSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.bookingMainInfo}>
        <SkeletonLoader width={100} height={16} borderRadius={4} style={{ marginBottom: 4 }} />
        <SkeletonLoader width={120} height={14} borderRadius={4} style={{ marginBottom: 8 }} />
        <SkeletonLoader width={80} height={12} borderRadius={4} />
      </View>
      <SkeletonLoader width={70} height={24} borderRadius={12} />
    </View>
  );
};

export const ClientBookingsSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <SkeletonLoader width={120} height={28} borderRadius={4} style={{ marginBottom: 5 }} />
        <SkeletonLoader width={180} height={16} borderRadius={4} />
      </View>

      <View style={styles.content}>
        <BookingCardSkeleton />
        <BookingCardSkeleton />
        <BookingCardSkeleton />
        <BookingCardSkeleton />
        <BookingCardSkeleton />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  section: {
    marginBottom: 30,
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '30%',
    maxWidth: '48%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  trainersList: {
    paddingHorizontal: 12,
  },
  trainersRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  trainerCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  trainerImageContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  trainerInfo: {
    alignItems: 'center',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerContent: {
    flex: 1,
  },
  progressCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  measurementRow: {
    flexDirection: 'row',
    gap: 16,
  },
});