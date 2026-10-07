import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { BottomTabNavigator } from './BottomTabNavigator';

const Drawer = createDrawerNavigator();

interface AppDrawerProps {
  onLogout: () => void;
  onOpenDevice: (deviceId: string) => void;
  onOpenMyDevices: () => void;
}

export function AppDrawer({ onLogout, onOpenDevice, onOpenMyDevices }: AppDrawerProps) {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: { backgroundColor: theme.textPrimary, width: 280 },
        drawerActiveTintColor: theme.primary,
        drawerInactiveTintColor: theme.textMuted,
        drawerLabelStyle: { fontSize: 14, fontWeight: '600' },
      }}
    >
      <Drawer.Screen
        name="MainTabs"
        options={{
          title: 'TechShare',
          drawerIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      >
        {() => (
          <BottomTabNavigator
            onLogout={onLogout}
            onOpenDevice={onOpenDevice}
            onOpenMyDevices={onOpenMyDevices}
          />
        )}
      </Drawer.Screen>
    </Drawer.Navigator>
  );
}
