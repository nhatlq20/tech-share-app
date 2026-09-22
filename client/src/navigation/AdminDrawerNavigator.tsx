import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { theme } from '../constants/theme';
import { AdminSidebarContent } from './AdminSidebarContent';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';

export type AdminDrawerParamList = {
  AdminDashboard:
    | {
        initialTab?: 'overview' | 'disputes' | 'ekyc' | 'devices' | 'users' | 'vouchers';
        _t?: number;
      }
    | undefined;
};

const Drawer = createDrawerNavigator<AdminDrawerParamList>();

export function AdminDrawerNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="AdminDashboard"
      drawerContent={(props: any) => <AdminSidebarContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerPosition: 'left',
        drawerType: 'front',
        swipeEnabled: true,
        swipeEdgeWidth: 100,
        drawerStyle: {
          width: '80%',
          maxWidth: 320,
          backgroundColor: theme.card,
        },
      }}
    >
      <Drawer.Screen name="AdminDashboard" component={AdminDashboardScreen} />
    </Drawer.Navigator>
  );
}

