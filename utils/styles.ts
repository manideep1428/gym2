import { StyleSheet, Platform, Dimensions } from 'react-native';
import { PlatformUtils } from './platform';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

export const createUniversalStyles = (colors: any) => {
  const platformStyles = PlatformUtils.getPlatformStyles();
  
  return StyleSheet.create({
    // Container styles
    container: {
      flex: 1,
      backgroundColor: colors.background,
      ...platformStyles.header,
    },
    
    safeContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    
    scrollContainer: {
      flexGrow: 1,
      paddingBottom: Platform.select({
        ios: 20,
        android: 16,
        default: 16,
      }),
    },
    
    // Card styles with platform-specific shadows
    card: {
      backgroundColor: colors.card,
      borderRadius: platformStyles.card.borderRadius,
      padding: isTablet ? 20 : 16,
      marginBottom: 16,
      borderWidth: Platform.select({
        ios: 0,
        android: 1,
        default: 1,
      }),
      borderColor: colors.border,
      ...platformStyles.shadow,
    },
    
    // Button styles
    primaryButton: {
      backgroundColor: colors.primary,
      ...platformStyles.button,
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    secondaryButton: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      ...platformStyles.button,
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    buttonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: Platform.select({
        ios: '600',
        android: '500',
        default: '500',
      }),
    },
    
    secondaryButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: Platform.select({
        ios: '600',
        android: '500',
        default: '500',
      }),
    },
    
    // Text input styles
    textInput: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
      ...platformStyles.textInput,
    },
    
    // Header styles
    header: {
      paddingHorizontal: platformStyles.containerPadding,
      marginBottom: platformStyles.sectionSpacing,
    },
    
    title: {
      fontSize: isTablet ? 32 : 28,
      fontWeight: Platform.select({
        ios: 'bold',
        android: '700',
        default: 'bold',
      }),
      color: colors.text,
      marginBottom: 8,
    },
    
    subtitle: {
      fontSize: isTablet ? 18 : 16,
      color: colors.textSecondary,
      lineHeight: isTablet ? 24 : 22,
    },
    
    // Section styles
    section: {
      marginBottom: platformStyles.sectionSpacing,
      paddingHorizontal: platformStyles.containerPadding,
    },
    
    sectionTitle: {
      fontSize: isTablet ? 22 : 20,
      fontWeight: Platform.select({
        ios: '600',
        android: '500',
        default: '600',
      }),
      color: colors.text,
      marginBottom: 12,
    },
    
    // List styles
    listItem: {
      backgroundColor: colors.card,
      borderRadius: platformStyles.card.borderRadius,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      ...platformStyles.shadow,
    },
    
    // Status badge styles
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: Platform.select({
        ios: 12,
        android: 8,
        default: 8,
      }),
      alignSelf: 'flex-start',
    },
    
    statusText: {
      fontSize: 12,
      fontWeight: Platform.select({
        ios: '500',
        android: '400',
        default: '500',
      }),
      textTransform: 'capitalize',
    },
    
    // Loading and empty states
    centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: platformStyles.containerPadding,
    },
    
    emptyStateText: {
      fontSize: isTablet ? 18 : 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 16,
      lineHeight: isTablet ? 26 : 24,
    },
    
    // Form styles
    formGroup: {
      marginBottom: 20,
    },
    
    label: {
      fontSize: 14,
      fontWeight: Platform.select({
        ios: '500',
        android: '400',
        default: '500',
      }),
      color: colors.text,
      marginBottom: 8,
    },
    
    // Navigation styles
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
      marginBottom: 16,
    },
    
    backButtonText: {
      fontSize: 16,
      color: colors.primary,
      marginLeft: 4,
      fontWeight: Platform.select({
        ios: '500',
        android: '400',
        default: '500',
      }),
    },
    
    // Responsive grid
    gridContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -8,
    },
    
    gridItem: {
      width: isTablet ? '33.33%' : '50%',
      paddingHorizontal: 8,
      marginBottom: 16,
    },
    
    // Platform-specific spacing
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },
  });
};

// Color utilities for cross-platform consistency
export const colorUtils = {
  withOpacity: (color: string, opacity: number) => {
    // Handle both hex and rgba colors
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  },
  
  getStatusColor: (status: string, colors: any) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'active':
      case 'success':
        return colors.success;
      case 'pending':
      case 'warning':
        return colors.warning;
      case 'cancelled':
      case 'error':
      case 'failed':
        return colors.error;
      case 'completed':
      case 'inactive':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  },
};

// Animation utilities
export const animationUtils = {
  spring: Platform.select({
    ios: {
      tension: 100,
      friction: 8,
    },
    android: {
      tension: 80,
      friction: 10,
    },
    default: {
      tension: 100,
      friction: 8,
    },
  }),
  
  timing: Platform.select({
    ios: {
      duration: 250,
    },
    android: {
      duration: 200,
    },
    default: {
      duration: 200,
    },
  }),
};
