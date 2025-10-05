import { Tabs } from 'expo-router';
import {
  House,
  Calendar,
  Package,
  TrendingUp,
  User,
  Bell,
  CreditCard,
  Users,
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationBadge } from '@/components/NotificationBadge';
import { View } from 'react-native';
import {
  useDeviceInfo,
  getAdaptiveTabBarStyle,
  getAdaptiveIconSize,
  getAdaptiveFontSize,
} from '@/utils/deviceUtils';

export default function ClientTabLayout() {
  const { colors } = useTheme();
  const { unreadCount, notifications } = useNotifications();
  const deviceInfo = useDeviceInfo();
  const adaptiveStyle = getAdaptiveTabBarStyle(deviceInfo);
  const iconSize = getAdaptiveIconSize(adaptiveStyle.height);
  const fontSize = getAdaptiveFontSize(adaptiveStyle.height);

  // Count payment request notifications for clients
  const paymentRequestCount = notifications.filter(n => 
    !n.is_read && n.type === 'payment_request'
  ).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: adaptiveStyle.paddingBottom,
          paddingTop: adaptiveStyle.paddingTop,
          height: adaptiveStyle.height,
          marginBottom: adaptiveStyle.marginBottom,
          // Add shadow for better separation
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: fontSize,
          fontWeight: '500',
          marginTop:6,
        },
        tabBarIconStyle: {
          marginTop:6,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <House color={color} size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color }) => <Calendar color={color} size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="trainers"
        options={{
          title: 'Trainers',
          tabBarIcon: ({ color }) => <Users color={color} size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="notification-settings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="trainer-search"
        options={{
          href: null,
        }}
      />     <Tabs.Screen
      name="trainer-profile"
      options={{
        href: null,
      }}
    />
      <Tabs.Screen
        name="packages"
        options={{
          title: 'Packages',
          tabBarIcon: ({ color }) => <Package color={color} size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          tabBarIcon: ({ color }) => (
            <View style={{ position: 'relative' }}>
              <CreditCard color={color} size={iconSize} />
              {paymentRequestCount > 0 && (
                <NotificationBadge count={paymentRequestCount} size="small" />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="book-session"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="edit-profile"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      {/* <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => (
            <TrendingUp color={color} size={iconSize} />
          ),
        }}
      /> */}
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => (
            <View style={{ position: 'relative' }}>
              <User color={color} size={iconSize} />
              {unreadCount > 0 && (
                <NotificationBadge count={unreadCount} size="small" />
              )}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
