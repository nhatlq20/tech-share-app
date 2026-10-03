import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { theme } from '../constants/theme';
import { OwnerSidebarContent } from './OwnerSidebarContent';
import { OwnerDashboardScreen } from '../screens/owner/OwnerDashboardScreen';
import { OwnerAnalyticsScreen } from '../screens/owner/OwnerAnalyticsScreen';
import { BookingManageScreen } from '../screens/booking/BookingManageScreen';

export type OwnerDrawerParamList = {
  OwnerDashboard:
    | {
        initialSection?: 'overview' | 'orders' | 'fleet' | 'wallet' | 'ai_tools';
        _t?: number;
      }
    | undefined;
  OwnerAnalytics: undefined;
  BookingManage: { initialTab?: 'pending' | 'renting' | 'history' } | undefined;
};

const Drawer = createDrawerNavigator<OwnerDrawerParamList>();

export function OwnerDrawerNavigator({ navigation }: any) {
  return (
    <Drawer.Navigator
      initialRouteName="OwnerDashboard"
      drawerContent={(props: any) => <OwnerSidebarContent {...props} />}
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
      <Drawer.Screen name="OwnerDashboard">
        {(props: any) => (
          <OwnerDashboardScreen
            {...props}
            onBackToHome={() => navigation.navigate('MainTabs')}
            onNavigateToDeviceDetail={(deviceId: string) =>
              navigation.navigate('DeviceDetail', { deviceId })
            }
            onNavigateToNotifications={() =>
              navigation.navigate('Notification', { from: 'owner' })
            }
            onOpenDrawer={() => props.navigation.openDrawer()}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen
        name="BookingManage"
        options={{ title: 'Booking Manage', drawerLabel: 'Quản lý đơn thuê' }}
      >
        {(props: any) => (
          <BookingManageScreen
            {...props}
            onBack={() => {
              if (props.navigation.canGoBack()) {
                props.navigation.goBack();
              } else {
                props.navigation.navigate('OwnerDashboard');
              }
            }}
            onOpenDrawer={() => props.navigation.openDrawer()}
            onNavigateToBookingDetail={(bookingId: string) =>
              navigation.navigate('BookingDetail', { bookingId })
            }
            onNavigateToNotifications={() =>
              navigation.navigate('Notification', { from: 'owner' })
            }
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen
        name="OwnerAnalytics"
        options={{ title: 'Owner Analytics', drawerLabel: 'Doanh thu & Phân tích' }}
      >
        {(props: any) => (
          <OwnerAnalyticsScreen
            onBackToHome={() => {
              if (props.navigation.canGoBack()) {
                props.navigation.goBack();
              } else {
                props.navigation.navigate('OwnerDashboard');
              }
            }}
          />
        )}
      </Drawer.Screen>
    </Drawer.Navigator>
  );
}
