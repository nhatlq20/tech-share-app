import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { theme } from '../constants/theme';
import { OwnerSidebarContent } from './OwnerSidebarContent';
import { OwnerDashboardScreen } from '../screens/owner/OwnerDashboardScreen';
import { OwnerAnalyticsScreen } from '../screens/owner/OwnerAnalyticsScreen';

export type OwnerDrawerParamList = {
  OwnerDashboard:
    | {
        initialSection?: 'overview' | 'orders' | 'fleet' | 'wallet' | 'ai_tools';
        _t?: number;
      }
    | undefined;
  OwnerAnalytics: undefined;
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
            onNavigateToPostDevice={() => navigation.navigate('PostDevice')}
            onNavigateToNotifications={() => navigation.navigate('Notification')}
            onOpenDrawer={() => props.navigation.openDrawer()}
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
