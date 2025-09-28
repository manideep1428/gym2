import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface NotificationBadgeProps {
  count: number;
  size?: 'small' | 'medium' | 'large';
  showZero?: boolean;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  count, 
  size = 'medium',
  showZero = false 
}) => {
  const { colors } = useTheme();

  if (count === 0 && !showZero) {
    return null;
  }

  const sizeStyles = {
    small: {
      width: 16,
      height: 16,
      borderRadius: 8,
      fontSize: 8, // Reduced from 10
    },
    medium: {
      width: 20,
      height: 20,
      borderRadius: 10,
      fontSize: 10, // Reduced from 12
    },
    large: {
      width: 24,
      height: 24,
      borderRadius: 12,
      fontSize: 12, // Reduced from 14
    },
  };

  const currentSize = sizeStyles[size];
  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.error,
          width: currentSize.width,
          height: currentSize.height,
          borderRadius: currentSize.borderRadius,
        },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            fontSize: currentSize.fontSize,
            color: '#FFFFFF',
          },
        ]}
      >
        {displayCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  badgeText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
