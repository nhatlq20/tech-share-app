import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { theme, STRINGS } from '../constants';
import { OwnerSidebarContent } from './OwnerSidebarContent';
import { OwnerDashboardScreen } from '../screens/owner/OwnerDashboardScreen';
import { OwnerAnalyticsScreen } from '../screens/owner/OwnerAnalyticsScreen';
import { BookingManageScreen } from '../screens/booking/BookingManageScreen';
import { PostDeviceScreen } from '../screens/device/PostDeviceScreen';
import { NotificationScreen } from '../screens/notification/NotificationScreen';

export type OwnerDrawerParamList = {
  OwnerDashboard:
    | {
        initialSection?: 'overview' | 'orders' | 'fleet' | 'wallet' | 'ai_tools';
        _t?: number;
      }
    | undefined;
  OwnerAnalytics: undefined;
  BookingManage: { initialTab?: 'pending' | 'renting' | 'history' } | undefined;
  PostDevice: undefined;
  Notification: { from?: string } | undefined;
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
            onNavigateToDeviceDetail={(deviceId: string) =>
              navigation.navigate('DeviceDetail', { deviceId })
            }
            onNavigateToNotifications={() =>
              props.navigation.navigate('Notification', { from: 'owner' })
            }
            onNavigateToPostDevice={() => props.navigation.navigate('PostDevice')}
            onOpenDrawer={() => props.navigation.openDrawer()}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen
        name="BookingManage"
        options={{
          title: STRINGS.OWNER_NAV.BOOKING_MANAGE_TITLE,
          drawerLabel: STRINGS.OWNER_NAV.BOOKING_MANAGE_DRAWER,
        }}
      >
        {(props: any) => (
          <BookingManageScreen
            {...props}
            onOpenDrawer={() => props.navigation.openDrawer()}
            onNavigateToBookingDetail={(bookingId: string) =>
              navigation.navigate('BookingDetail', { bookingId })
            }
            onNavigateToNotifications={() =>
              props.navigation.navigate('Notification', { from: 'owner' })
            }
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen
        name="OwnerAnalytics"
        options={{
          title: STRINGS.OWNER_NAV.ANALYTICS_TITLE,
          drawerLabel: STRINGS.OWNER_NAV.ANALYTICS_DRAWER,
        }}
      >
        {(props: any) => (
          <OwnerAnalyticsScreen
            {...props}
            onOpenDrawer={() => props.navigation.openDrawer()}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen
        name="PostDevice"
        options={{
          title: STRINGS.OWNER_NAV.POST_DEVICE_TITLE,
          drawerLabel: STRINGS.OWNER_NAV.POST_DEVICE_DRAWER,
        }}
      >
        {(props: any) => (
          <PostDeviceScreen
            {...props}
            onOpenDrawer={() => props.navigation.openDrawer()}
            onPublished={() => {
              props.navigation.navigate('OwnerDashboard', { initialSection: 'fleet' });
            }}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen
        name="Notification"
        options={{
          title: STRINGS.OWNER_NAV.NOTIFICATION_TITLE,
          drawerLabel: STRINGS.OWNER_NAV.NOTIFICATION_DRAWER,
        }}
      >
        {(props: any) => (
          <NotificationScreen
            {...props}
            onOpenDrawer={() => props.navigation.openDrawer()}
            onNavigateToBooking={(bookingId?: string) => {
              if (bookingId) {
                navigation.navigate('BookingDetail', { bookingId });
              } else {
                props.navigation.navigate('BookingManage');
              }
            }}
            onNavigateToDevice={(deviceId?: string) => {
              if (deviceId) {
                navigation.navigate('DeviceDetail', { deviceId });
              }
            }}
          />
        )}
      </Drawer.Screen>
    </Drawer.Navigator>
  );
}
