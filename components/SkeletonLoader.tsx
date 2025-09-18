import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

const { width: screenWidth } = Dimensions.get('window');

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
  variant?: 'rectangle' | 'circle' | 'text' | 'card';
}

export const SkeletonLoader: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
  variant = 'rectangle'
}) => {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const getBorderRadius = () => {
    switch (variant) {
      case 'circle': return typeof width === 'number' ? width / 2 : borderRadius;
      case 'text': return 4;
      case 'card': return 16;
      default: return borderRadius;
    }
  };

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surface, colors.border],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: getBorderRadius(),
          backgroundColor,
          ...(variant === 'card' && {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }),
        },
        style,
      ]}
    />
  );
};

// Modern Skeleton Components with Better Design

// Shimmer Effect Component
export const ShimmerView: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const { colors } = useTheme();

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    animation.start();

    return () => animation.stop();
  }, []);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenWidth, screenWidth],
  });

  return (
    <View style={{ overflow: 'hidden' }}>
      {children}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.surface,
          opacity: 0.8,
          transform: [{ translateX }],
        }}
      />
    </View>
  );
};

// Modern Card Skeleton
export const CardSkeleton: React.FC<{
  height?: number;
  width?: number | string;
  hasAvatar?: boolean;
  lines?: number;
}> = ({ height = 120, width = '100%', hasAvatar = false, lines = 3 }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.modernCard, { height, backgroundColor: colors.card }]}>
      {hasAvatar && (
        <View style={styles.avatarSection}>
          <SkeletonLoader variant="circle" width={50} height={50} />
        </View>
      )}
      <View style={styles.contentSection}>
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonLoader
            key={index}
            variant="text"
            width={`${100 - index * 20}%`}
            height={14}
            style={{ marginBottom: 6 }}
          />
        ))}
      </View>
    </View>
  );
};

// List Item Skeleton
export const ListItemSkeleton: React.FC<{
  hasAvatar?: boolean;
  lines?: number;
  height?: number;
}> = ({ hasAvatar = true, lines = 2, height = 80 }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.listItem, { height, backgroundColor: colors.card }]}>
      {hasAvatar && (
        <SkeletonLoader variant="circle" width={40} height={40} style={{ marginRight: 12 }} />
      )}
      <View style={styles.listContent}>
        {Array.from({ length: lines }).map((_, index) => (
          <SkeletonLoader
            key={index}
            variant="text"
            width={`${90 - index * 15}%`}
            height={12}
            style={{ marginBottom: 4 }}
          />
        ))}
      </View>
      <SkeletonLoader variant="rectangle" width={60} height={24} borderRadius={12} />
    </View>
  );
};

// Grid Item Skeleton
export const GridItemSkeleton: React.FC<{
  height?: number;
  showStats?: boolean;
}> = ({ height = 140, showStats = false }) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.gridItem, { height, backgroundColor: colors.card }]}>
      <View style={styles.gridIcon}>
        <SkeletonLoader variant="circle" width={32} height={32} />
      </View>
      <View style={styles.gridContent}>
        <SkeletonLoader variant="text" width={80} height={16} style={{ marginBottom: 4 }} />
        {showStats && (
          <SkeletonLoader variant="text" width={60} height={12} />
        )}
      </View>
    </View>
  );
};

// Booking Card Skeleton (More Detailed)
export const BookingCardSkeleton = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.bookingCardSkeleton, { backgroundColor: colors.card }]}>
      <View style={styles.bookingHeader}>
        <View style={styles.trainerSection}>
          <SkeletonLoader variant="circle" width={16} height={16} />
          <SkeletonLoader variant="text" width={100} height={14} />
        </View>
        <SkeletonLoader variant="rectangle" width={70} height={24} borderRadius={12} />
      </View>

      <View style={styles.bookingDetails}>
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={index} style={styles.detailRow}>
            <SkeletonLoader variant="circle" width={14} height={14} />
            <SkeletonLoader variant="text" width={120} height={12} />
          </View>
        ))}
      </View>

      <View style={styles.bookingActions}>
        <SkeletonLoader variant="rectangle" width={140} height={32} borderRadius={16} />
        <SkeletonLoader variant="rectangle" width={140} height={32} borderRadius={16} />
      </View>
    </View>
  );
};

// Time Slot Grid Skeleton
export const TimeSlotSkeleton = () => {
  const { colors } = useTheme();

  return (
    <View style={styles.timeSlotsContainer}>
      {/* Morning Section */}
      <View style={styles.timeSection}>
        <View style={styles.sectionHeader}>
          <SkeletonLoader variant="circle" width={20} height={20} />
          <SkeletonLoader variant="text" width={100} height={16} />
        </View>
        <View style={styles.slotGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <View key={`morning-${index}`} style={styles.timeSlotItem}>
              <SkeletonLoader variant="text" width={60} height={16} />
              <SkeletonLoader variant="text" width={80} height={12} />
              <SkeletonLoader variant="text" width={80} height={12} />
            </View>
          ))}
        </View>
      </View>

      {/* Afternoon Section */}
      <View style={styles.timeSection}>
        <View style={styles.sectionHeader}>
          <SkeletonLoader variant="circle" width={20} height={20} />
          <SkeletonLoader variant="text" width={100} height={16} />
        </View>
        <View style={styles.slotGrid}>
          {Array.from({ length: 4 }).map((_, index) => (
            <View key={`afternoon-${index}`} style={styles.timeSlotItem}>
              <SkeletonLoader variant="text" width={60} height={16} />
              <SkeletonLoader variant="text" width={80} height={12} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// Header Skeleton
export const HeaderSkeleton = ({ titleWidth = 200, subtitleWidth = 150 }) => {
  return (
    <View style={styles.headerSkeleton}>
      <SkeletonLoader variant="text" width={titleWidth} height={28} />
      <SkeletonLoader variant="text" width={subtitleWidth} height={16} />
    </View>
  );
};

// Content Loading Overlay (For specific sections)
export const ContentLoadingOverlay: React.FC<{
  isVisible: boolean;
  children: React.ReactNode;
  message?: string;
}> = ({ isVisible, children, message = "Loading..." }) => {
  const { colors } = useTheme();

  if (!isVisible) return <>{children}</>;

  return (
    <View style={styles.overlayContainer}>
      {children}
      <View style={[styles.overlay, { backgroundColor: colors.background + 'F0' }]}>
        <View style={[styles.loadingCard, { backgroundColor: colors.card }]}>
          <View style={styles.loadingSpinner}>
            <SkeletonLoader variant="circle" width={40} height={40} />
          </View>
          <SkeletonLoader variant="text" width={120} height={16} />
        </View>
      </View>
    </View>
  );
};

// Trainer Stat Card Skeleton
export const TrainerStatCardSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <SkeletonLoader variant="circle" width={48} height={48} style={{ marginBottom: 12 }} />
      <SkeletonLoader variant="text" width={40} height={24} style={{ marginBottom: 4 }} />
      <SkeletonLoader variant="text" width={80} height={12} />
    </View>
  );
};

// Trainer Booking Card Skeleton
export const TrainerBookingCardSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.bookingInfo}>
        <SkeletonLoader variant="text" width={120} height={16} borderRadius={4} style={{ marginBottom: 4 }} />
        <SkeletonLoader variant="text" width={100} height={12} borderRadius={4} />
      </View>
      <SkeletonLoader variant="rectangle" width={60} height={24} borderRadius={12} />
    </View>
  );
};

// Trainer Action Card Skeleton
export const TrainerActionCardSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <SkeletonLoader variant="circle" width={24} height={24} style={{ marginBottom: 8 }} />
      <SkeletonLoader variant="text" width={70} height={12} borderRadius={4} />
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
export const SimpleBookingCardSkeleton = () => {
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

// Detailed Booking Card Skeleton for create and remaining info
export const DetailedBookingCardSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.detailedBookingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header with trainer info and status */}
      <View style={styles.bookingHeader}>
        <View style={styles.bookingInfo}>
          <View style={styles.trainerInfo}>
            <SkeletonLoader width={16} height={16} borderRadius={8} style={{ marginRight: 8 }} />
            <SkeletonLoader width={120} height={16} borderRadius={4} />
          </View>
          <SkeletonLoader width={70} height={24} borderRadius={12} />
        </View>
      </View>

      {/* Booking Details - Date, Time, Duration */}
      <View style={styles.bookingDetails}>
        {/* Date Row */}
        <View style={styles.detailRow}>
          <SkeletonLoader width={16} height={16} borderRadius={8} style={{ marginRight: 8 }} />
          <SkeletonLoader width={100} height={14} borderRadius={4} />
        </View>

        {/* Time Row */}
        <View style={styles.detailRow}>
          <SkeletonLoader width={16} height={16} borderRadius={8} style={{ marginRight: 8 }} />
          <SkeletonLoader width={120} height={14} borderRadius={4} />
        </View>

        {/* Duration Row */}
        <View style={styles.detailRow}>
          <SkeletonLoader width={16} height={16} borderRadius={8} style={{ marginRight: 8 }} />
          <SkeletonLoader width={80} height={14} borderRadius={4} />
        </View>
      </View>

      {/* Calendar section */}
      <View style={styles.calendarSection}>
        <SkeletonLoader width={180} height={14} borderRadius={4} />
      </View>
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

// Trainer Bookings Skeleton
export const TrainerBookingsSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.header}>
        <SkeletonLoader width={120} height={28} borderRadius={4} style={{ marginBottom: 5 }} />
        <SkeletonLoader width={160} height={16} borderRadius={4} />
      </View>

      <View style={styles.content}>
        <BookingCardSkeleton />
        <BookingCardSkeleton />
        <BookingCardSkeleton />
        <BookingCardSkeleton />
      </View>
    </View>
  );
};

// Trainer Clients Skeleton
export const TrainerClientsSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={styles.header}>
        <SkeletonLoader width={120} height={28} borderRadius={4} style={{ marginBottom: 5 }} />
        <SkeletonLoader width={140} height={16} borderRadius={4} />
      </View>

      <View style={styles.content}>
        <View style={{ gap: 12 }}>
          <View style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <SkeletonLoader width={48} height={48} borderRadius={24} style={{ marginRight: 12 }} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonLoader width={140} height={16} />
              <SkeletonLoader width={180} height={12} />
            </View>
          </View>
          <View style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <SkeletonLoader width={48} height={48} borderRadius={24} style={{ marginRight: 12 }} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonLoader width={160} height={16} />
              <SkeletonLoader width={140} height={12} />
            </View>
          </View>
          <View style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <SkeletonLoader width={48} height={48} borderRadius={24} style={{ marginRight: 12 }} />
            <View style={{ flex: 1, gap: 6 }}>
              <SkeletonLoader width={120} height={16} />
              <SkeletonLoader width={200} height={12} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

// Generic List Skeleton
export const ListSkeleton = ({ children }:any) => {
  return (
    <View style={{ gap: 12 }}>
      {children}
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
    alignItems: 'center',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 4,
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
  section: {
    marginBottom: 30,
  },
  headerSkeleton: {
    paddingHorizontal: 20,
    marginBottom: 20,
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
  bookingMainInfo: {
    flex: 1,
  },
  detailedBookingCard: {
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
  bookingHeader: {
    marginBottom: 12,
  },
  bookingDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarSection: {
    marginTop: 12,
  },
  progressList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  // Modern skeleton styles
  overlayContainer: {
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 200,
  },
  loadingSpinner: {
    marginBottom: 16,
  },
  modernCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  contentSection: {
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  listContent: {
    flex: 1,
  },
  gridItem: {
    borderRadius: 16,
    padding: 16,
    margin: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gridIcon: {
    marginBottom: 12,
  },
  gridContent: {
    alignItems: 'center',
  },
  bookingCardSkeleton: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trainerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeSlotsContainer: {
    gap: 24,
  },
  timeSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  timeSlotItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 12,
    gap: 4,
  },
  bookingActions: {
    marginTop: 12,
  },
});