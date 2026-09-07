import React from 'react';
import { Platform } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '@/components/AppIcon';
 
export default function TabLayout() {
  const colors = useColors();
  const isWeb = Platform.OS === 'web';
  const isAndroid = Platform.OS === 'android';
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: isWeb ? 84 : isAndroid ? 84 + insets.bottom : 68,
          paddingTop: 7,
          paddingBottom: isWeb ? 24 : isAndroid ? insets.bottom + 8 : 8,
        },
        tabBarItemStyle: isAndroid ? { paddingVertical: 3 } : undefined,
        tabBarLabelStyle: { fontSize: isAndroid ? 12 : 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen name="clients" options={{ title: 'Clients', tabBarIcon: ({ color }) => <AppIcon name="users" size={isAndroid ? 24 : 21} color={color} /> }} />
      <Tabs.Screen name="exercises" options={{ title: 'Exercises', tabBarIcon: ({ color }) => <AppIcon name="activity" size={isAndroid ? 24 : 21} color={color} /> }} />
      <Tabs.Screen name="plans" options={{ title: 'Workouts', tabBarIcon: ({ color }) => <AppIcon name="clipboard" size={isAndroid ? 24 : 21} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color }) => <AppIcon name="settings" size={isAndroid ? 24 : 21} color={color} /> }} />
    </Tabs>
  );
}
