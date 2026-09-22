import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { HomeScreen } from '../screens/home/HomeScreen';
import { MyBookingsScreen } from '../screens/booking/MyBookingsScreen';
import { MapScreen } from '../screens/map/MapScreen';
import { ProfileScreen } from '../screens/user/ProfileScreen';
import { BottomTabNavigator as CustomTabBar } from '../components/navigation/BottomTabNavigator';
import { clearAuth } from '../store/slices/authSlice';
import { socketService } from '../services/socketService';
import { RootState } from '../store';
import { ScreenType } from '../types';

export type MainBottomTabParamList = {
  Home: undefined;
  Bookings: undefined;
  Map: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainBottomTabParamList>();

export function MainBottomTabNavigator({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const unreadNotificationsCount = useSelector(
    (state: RootState) => state.notifications?.unreadCount ?? 0
  );

  const handleLogout = () => {
    socketService.disconnect();
    dispatch(clearAuth());
  };

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
      }}
      tabBar={({ state, navigation: tabNav }: any) => {
        const routeName = state.routes[state.index].name.toLowerCase() as ScreenType;

        return (
          <CustomTabBar
            activeTab={routeName}
            onTabPress={(tabKey) => {
              const matchedRoute = state.routes.find(
                (r: any) => r.name.toLowerCase() === tabKey.toLowerCase()
              );
              if (matchedRoute) {
                tabNav.navigate(matchedRoute.name);
              }
            }}
            safeAreaBottom={insets.bottom}
            pendingBookingsCount={0}
          />
        );
      }}
    >
      <Tab.Screen name="Home">
        {() => (
          <HomeScreen
            onNavigateToDeviceDetail={(deviceId) =>
              navigation.navigate('DeviceDetail', { deviceId })
            }
            onNavigateToSearch={() => console.log('[Nav] Search')}
            onNavigateToNotifications={() => navigation.navigate('Notification')}
            onNavigateToChat={() => console.log('[Nav] Chat')}
            unreadMessages={2}
            unreadNotifications={unreadNotificationsCount}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Bookings">
        {() => (
          <MyBookingsScreen
            onNavigateToDeviceDetail={(deviceId) =>
              navigation.navigate('DeviceDetail', { deviceId })
            }
            onNavigateToHome={() => navigation.navigate('Home')}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Map">
        {() => (
          <MapScreen
            onNavigateToDeviceDetail={(deviceId) =>
              navigation.navigate('DeviceDetail', { deviceId })
            }
            onNavigateToHome={() => navigation.navigate('Home')}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Profile">
        {() => (
          <ProfileScreen
            onLogout={handleLogout}
            onNavigateToLogin={() => navigation.navigate('Login')}
            onNavigateToPostDevice={() => navigation.navigate('PostDevice')}
            onNavigateToMyDevices={() => navigation.navigate('MyDevices')}
            onNavigateToOwnerDashboard={() => navigation.navigate('OwnerDashboard')}
            onNavigateToAdminDashboard={() => navigation.navigate('AdminRoot')}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
