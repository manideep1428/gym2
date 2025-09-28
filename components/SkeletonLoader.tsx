import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Text } from 'react-native';

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

// Calendar Skeleton
export const CalendarSkeleton = () => {
  const { colors } = useTheme();

  return (
    <View style={styles.calendarSkeletonContainer}>
      {/* Calendar Header */}
      <View style={styles.calendarSkeletonHeader}>
        <SkeletonLoader variant="circle" width={20} height={20} />
        <SkeletonLoader variant="text" width={120} height={18} />
        <SkeletonLoader variant="circle" width={20} height={20} />
      </View>

      {/* Days Header */}
      <View style={styles.calendarDaysHeader}>
        {Array.from({ length: 7 }).map((_, index) => (
          <SkeletonLoader key={index} variant="text" width={30} height={12} />
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {Array.from({ length: 42 }).map((_, index) => (
          <View key={index} style={styles.calendarDateSkeleton}>
            <SkeletonLoader variant="circle" width={32} height={32} />
            {/* Random availability dots */}
            {Math.random() > 0.7 && (
              <View style={[styles.availabilityDotSkeleton, { backgroundColor: colors.primary }]} />
            )}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.calendarLegend}>
        <View style={styles.legendItem}>
          <SkeletonLoader variant="circle" width={12} height={12} />
          <SkeletonLoader variant="text" width={60} height={12} />
        </View>
        <View style={styles.legendItem}>
          <SkeletonLoader variant="circle" width={12} height={12} />
          <SkeletonLoader variant="text" width={50} height={12} />
        </View>
      </View>
    </View>
  );
};

// Compact Booking Card Skeleton (matches new design)
export const CompactBookingCardSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.compactCardSkeleton, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.compactCardContentSkeleton}>
        <View style={styles.compactLeftContentSkeleton}>
          <SkeletonLoader variant="circle" width={16} height={16} />
          <View style={styles.compactTextContentSkeleton}>
            <SkeletonLoader variant="text" width={100} height={14} />
            <SkeletonLoader variant="text" width={120} height={12} />
          </View>
        </View>
        
        <View style={styles.compactRightContentSkeleton}>
          <SkeletonLoader variant="rectangle" width={70} height={20} borderRadius={10} />
          <SkeletonLoader variant="circle" width={16} height={16} />
        </View>
      </View>
    </View>
  );
};

// Compact Package Card Skeleton (matches new design)
export const CompactPackageCardSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.compactCardSkeleton, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.compactCardContentSkeleton}>
        <View style={styles.compactLeftContentSkeleton}>
          <SkeletonLoader variant="circle" width={16} height={16} />
          <View style={styles.compactTextContentSkeleton}>
            <SkeletonLoader variant="text" width={120} height={14} />
            <SkeletonLoader variant="text" width={60} height={16} />
          </View>
        </View>
        
        <View style={styles.compactRightContentSkeleton}>
          <SkeletonLoader variant="rectangle" width={50} height={20} borderRadius={10} />
          <SkeletonLoader variant="circle" width={16} height={16} />
        </View>
      </View>
    </View>
  );
};

// Compact Payment Card Skeleton (matches new design)
export const CompactPaymentCardSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.compactCardSkeleton, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.compactCardContentSkeleton}>
        <View style={styles.compactLeftContentSkeleton}>
          <SkeletonLoader variant="circle" width={16} height={16} />
          <View style={styles.compactTextContentSkeleton}>
            <SkeletonLoader variant="text" width={100} height={14} />
            <SkeletonLoader variant="text" width={50} height={16} />
          </View>
        </View>
        
        <View style={styles.compactRightContentSkeleton}>
          <SkeletonLoader variant="rectangle" width={80} height={20} borderRadius={10} />
          <SkeletonLoader variant="circle" width={16} height={16} />
        </View>
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
        <CompactBookingCardSkeleton />
        <CompactBookingCardSkeleton />
        <CompactBookingCardSkeleton />
        <CompactBookingCardSkeleton />
        <CompactBookingCardSkeleton />
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
        <CompactBookingCardSkeleton />
        <CompactBookingCardSkeleton />
        <CompactBookingCardSkeleton />
        <CompactBookingCardSkeleton />
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
            {/* <View style={{ flex: 1, gap: 6 }}>
              <SkeletonLoader width={120} height={16} />
              <SkeletonLoader width={200} height={12} />
            </View> */}
          </View>
        </View>
      </View>
    </View>
  );
};

// Client Packages Skeleton
export const ClientPackagesSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
     <View style={styles.header}>
           <Text style={[styles.title, { color: colors.text }]}>Training Packages</Text>
           <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
             Choose the perfect package for your goals
           </Text>
     </View>

      <View style={styles.content}>
        <CompactPackageCardSkeleton />
        <CompactPackageCardSkeleton />
        <CompactPackageCardSkeleton />
        <CompactPackageCardSkeleton />
        <CompactPackageCardSkeleton />
      </View>
    </View>
  );
};

// Trainer Packages Skeleton
export const TrainerPackagesSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <SkeletonLoader width={140} height={28} borderRadius={4} style={{ marginBottom: 5 }} />
          <SkeletonLoader width={180} height={16} borderRadius={4} />
        </View>
        <SkeletonLoader width={44} height={44} borderRadius={22} />
      </View>

      <View style={styles.content}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={[styles.packageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.packageHeader}>
              <View style={styles.packageInfo}>
                <SkeletonLoader width={140} height={18} borderRadius={4} style={{ marginBottom: 6 }} />
                <SkeletonLoader width={100} height={20} borderRadius={12} />
              </View>
              <View style={styles.packageActions}>
                <SkeletonLoader width={60} height={20} borderRadius={10} />
                <SkeletonLoader width={16} height={16} borderRadius={8} />
              </View>
            </View>
            
            <SkeletonLoader width="90%" height={14} borderRadius={4} style={{ marginBottom: 16 }} />
            
            <View style={styles.packageDetails}>
              <View style={styles.detailRow}>
                <SkeletonLoader width={16} height={16} borderRadius={8} style={{ marginRight: 8 }} />
                <SkeletonLoader width={60} height={18} borderRadius={4} />
              </View>
              <View style={styles.detailRow}>
                <SkeletonLoader width={16} height={16} borderRadius={8} style={{ marginRight: 8 }} />
                <SkeletonLoader width={80} height={14} borderRadius={4} />
              </View>
              <View style={styles.detailRow}>
                <SkeletonLoader width={16} height={16} borderRadius={8} style={{ marginRight: 8 }} />
                <SkeletonLoader width={100} height={14} borderRadius={4} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// Client Payments Skeleton
export const ClientPaymentsSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
               <View style={styles.headerContent}>
                 <Text style={[styles.title, { color: colors.text }]}>Payment Requests</Text>
               </View>
             </View>

      <View style={styles.content}>
        <CompactPaymentCardSkeleton />
        <CompactPaymentCardSkeleton />
        <CompactPaymentCardSkeleton />
        <CompactPaymentCardSkeleton />
        <CompactPaymentCardSkeleton />
      </View>
    </View>
  );
};

// Trainer Payments Skeleton
export const TrainerPaymentsSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <SkeletonLoader width={140} height={28} borderRadius={4} style={{ marginBottom: 5 }} />
        <SkeletonLoader width={180} height={16} borderRadius={4} />
      </View>

      <View style={styles.content}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View key={index} style={[styles.paymentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.paymentHeader}>
              <View style={styles.clientInfo}>
                <SkeletonLoader width={32} height={32} borderRadius={16} style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <SkeletonLoader width={100} height={16} borderRadius={4} style={{ marginBottom: 4 }} />
                  <SkeletonLoader width={80} height={12} borderRadius={4} />
                </View>
              </View>
              <SkeletonLoader width={60} height={24} borderRadius={12} />
            </View>
            <View style={styles.paymentDetails}>
              <SkeletonLoader width={120} height={14} borderRadius={4} style={{ marginBottom: 4 }} />
              <SkeletonLoader width={90} height={12} borderRadius={4} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// Trainer Schedule/Availability Skeleton
export const TrainerScheduleSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <SkeletonLoader variant="circle" width={24} height={24} />
          <SkeletonLoader width={120} height={20} borderRadius={4} />
          <View style={styles.headerActions}>
            <SkeletonLoader width={80} height={32} borderRadius={16} />
            <SkeletonLoader variant="circle" width={40} height={40} />
          </View>
        </View>
      </View>

      {/* View Toggle */}
      <View style={styles.viewToggleSkeleton}>
        <SkeletonLoader width={100} height={36} borderRadius={8} />
        <SkeletonLoader width={100} height={36} borderRadius={8} />
      </View>

      {/* Helper Section */}
      <View style={styles.helperSkeleton}>
        <SkeletonLoader width={160} height={16} borderRadius={4} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="90%" height={14} borderRadius={4} />
      </View>

      <View style={styles.content}>
        {/* Calendar Skeleton */}
        <CalendarSkeleton />
        
        {/* Weekly View Skeleton */}
        <View style={styles.weeklyViewSkeleton}>
          {Array.from({ length: 7 }).map((_, dayIndex) => (
            <View key={dayIndex} style={[styles.daySkeleton, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.dayHeaderSkeleton}>
                <SkeletonLoader width={80} height={18} borderRadius={4} />
                <SkeletonLoader variant="circle" width={28} height={28} />
              </View>
              {/* Random time slots */}
              {Math.random() > 0.5 ? (
                <View style={styles.timeSlotsSkeleton}>
                  {Array.from({ length: Math.floor(Math.random() * 3) + 1 }).map((_, slotIndex) => (
                    <View key={slotIndex} style={[styles.timeSlotSkeleton, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
                      <View style={styles.timeInfoSkeleton}>
                        <SkeletonLoader variant="circle" width={16} height={16} />
                        <SkeletonLoader width={100} height={14} borderRadius={4} />
                      </View>
                      <SkeletonLoader variant="circle" width={24} height={24} />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyStateSkeleton}>
                  <SkeletonLoader variant="circle" width={24} height={24} style={{ marginBottom: 8 }} />
                  <SkeletonLoader width={120} height={14} borderRadius={4} style={{ marginBottom: 4 }} />
                  <SkeletonLoader width={140} height={12} borderRadius={4} />
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

// Trainer Notifications Skeleton
export const TrainerNotificationsSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <SkeletonLoader width={140} height={28} borderRadius={4} style={{ marginBottom: 5 }} />
        <SkeletonLoader width={100} height={16} borderRadius={4} />
      </View>

      <View style={styles.content}>
        {Array.from({ length: 5 }).map((_, index) => (
          <View key={index} style={[styles.notificationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.notificationHeader}>
              <SkeletonLoader width={24} height={24} borderRadius={12} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <SkeletonLoader width={160} height={16} borderRadius={4} style={{ marginBottom: 4 }} />
                <SkeletonLoader width={120} height={12} borderRadius={4} />
              </View>
              <SkeletonLoader width={8} height={8} borderRadius={4} />
            </View>
            <SkeletonLoader width="90%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>
    </View>
  );
};

// Enhanced Trainer Client Requests Skeleton
export const TrainerClientRequestsSkeleton = () => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab Headers */}
      <View style={styles.tabContainer}>
        <SkeletonLoader width={120} height={16} borderRadius={4} />
        <SkeletonLoader width={100} height={16} borderRadius={4} />
      </View>

      <View style={styles.content}>
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={index} style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.requestHeader}>
              <SkeletonLoader width={40} height={40} borderRadius={20} style={{ marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <SkeletonLoader width={120} height={16} borderRadius={4} style={{ marginBottom: 4 }} />
                <SkeletonLoader width={80} height={12} borderRadius={4} />
              </View>
            </View>
            <SkeletonLoader width="100%" height={14} borderRadius={4} style={{ marginTop: 12, marginBottom: 16 }} />
            <View style={styles.requestActions}>
              <SkeletonLoader width={80} height={32} borderRadius={8} />
              <SkeletonLoader width={80} height={32} borderRadius={8} />
            </View>
          </View>
        ))}
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
  // Calendar Skeleton Styles
  calendarSkeletonContainer: {
    gap: 16,
  },
  calendarSkeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  calendarDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 8,
  },
  calendarDateSkeleton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  availabilityDotSkeleton: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    bottom: 4,
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // Enhanced Trainer Schedule Skeleton Styles
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewToggleSkeleton: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 4,
  },
  helperSkeleton: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
  },
  weeklyViewSkeleton: {
    gap: 16,
  },
  daySkeleton: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  dayHeaderSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeSlotsSkeleton: {
    gap: 8,
  },
  timeSlotSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeInfoSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyStateSkeleton: {
    alignItems: 'center',
    paddingVertical: 20,
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
  // Compact card skeleton styles
  compactCardSkeleton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactCardContentSkeleton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactLeftContentSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  compactTextContentSkeleton: {
    flex: 1,
  },
  compactRightContentSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // New trainer-specific styles
  packageCard: {
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
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  paymentCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentDetails: {
    gap: 4,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  calendarContainer: {
    gap: 16,
  },
  daysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  timeSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  subtitle: {
    fontSize: 14,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 20,
  },
  requestCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageInfo: {
    flex: 1,
    marginRight: 16,
  },
  packageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  packageDetails: {
    gap: 8,
  },
});