import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabNavigator } from './BottomTabNavigator';

const Drawer = createDrawerNavigator();

interface AppDrawerProps {
  onLogout: () => void;
  onOpenDevice: (deviceId: string) => void;
}

export function AppDrawer({ onLogout, onOpenDevice }: AppDrawerProps) {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: { backgroundColor: '#0F172A', width: 280 },
        drawerActiveTintColor: '#38BDF8',
        drawerInactiveTintColor: '#CBD5E1',
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
        {() => <BottomTabNavigator onLogout={onLogout} onOpenDevice={onOpenDevice} />}
      </Drawer.Screen>
    </Drawer.Navigator>
  );
}
