import { Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Get device dimensions and safe area info
export const useDeviceInfo = () => {
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');
  
  // Detect if device likely uses gesture navigation
  // Gesture navigation typically has larger bottom insets (>20px)
  const hasGestureNavigation = insets.bottom > 20;
  
  // Detect if device has physical/capacitive buttons
  // These typically have smaller bottom insets (0-10px)
  const hasPhysicalButtons = insets.bottom <= 10;
  
  // Detect if device has 3-button navigation
  // These typically have medium bottom insets (10-20px)
  const hasThreeButtonNav = insets.bottom > 10 && insets.bottom <= 20;
  
  return {
    width,
    height,
    insets,
    hasGestureNavigation,
    hasPhysicalButtons,
    hasThreeButtonNav,
    isAndroid: Platform.OS === 'android',
    isIOS: Platform.OS === 'ios',
  };
};

// Calculate adaptive tab bar height and padding
export const getAdaptiveTabBarStyle = (deviceInfo: ReturnType<typeof useDeviceInfo>) => {
  const { hasGestureNavigation, hasPhysicalButtons, hasThreeButtonNav, insets, isAndroid } = deviceInfo;
  
  let tabBarHeight = 70; // Base height
  let paddingBottom = 8; // Base padding
  let paddingTop = 8;
  
  if (isAndroid) {
    if (hasGestureNavigation) {
      // Gesture navigation - need more space for gesture area
      tabBarHeight = 85;
      paddingBottom = Math.max(12, insets.bottom - 10); // Leave space for gestures
      paddingTop = 12;
    } else if (hasThreeButtonNav) {
      // 3-button navigation - moderate spacing
      tabBarHeight = 75;
      paddingBottom = 10;
      paddingTop = 10;
    } else if (hasPhysicalButtons) {
      // Physical buttons - minimal spacing
      tabBarHeight = 70;
      paddingBottom = 8;
      paddingTop = 8;
    }
  } else {
    // iOS - use safe area insets
    tabBarHeight = 70 + Math.max(0, insets.bottom - 10);
    paddingBottom = Math.max(8, insets.bottom / 2);
  }
  
  return {
    height: tabBarHeight,
    paddingBottom,
    paddingTop,
    // Add margin bottom for gesture navigation to avoid conflicts
    marginBottom: hasGestureNavigation ? 2 : 0,
  };
};

// Get adaptive icon size based on tab bar height
export const getAdaptiveIconSize = (tabBarHeight: number) => {
  if (tabBarHeight >= 85) return 22; // Large tabs
  if (tabBarHeight >= 75) return 20; // Medium tabs
  return 18; // Small tabs
};

// Get adaptive font size for tab labels
export const getAdaptiveFontSize = (tabBarHeight: number) => {
  if (tabBarHeight >= 85) return 10; // Large tabs - reduced from 12
  if (tabBarHeight >= 75) return 9; // Medium tabs - reduced from 11
  return 8; // Small tabs - reduced from 10
};