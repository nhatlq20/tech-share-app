import React, { useCallback, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { HomeScreen } from '../screens/home/HomeScreen';
import { MyBookingsScreen } from '../screens/booking/MyBookingsScreen';
import { MapScreen } from '../screens/map/MapScreen';
import { ProfileScreen } from '../screens/user/ProfileScreen';
import { AiCompareScreen } from '../screens/ai/AiCompareScreen';
import { BottomTabNavigator as CustomTabBar } from '../components/navigation/BottomTabNavigator';
import { clearAuth } from '../store/slices/authSlice';
import {
  setUnreadMessagesCount,
  incrementUnreadMessages,
} from '../store/slices/notificationSlice';
import { chatService } from '../services/chatService';
import { socketService } from '../services/socketService';
import { RootState } from '../store';
import { ScreenType } from '../types';

export type MainBottomTabParamList = {
  Home: undefined;
  Bookings: undefined;
  Map: undefined;
  Compare: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainBottomTabParamList>();

export function MainBottomTabNavigator({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const unreadNotificationsCount = useSelector(
    (state: RootState) => state.notifications?.unreadCount ?? 0
  );
  const unreadMessagesCount = useSelector(
    (state: RootState) => state.notifications?.unreadMessagesCount ?? 0
  );

  useEffect(() => {
    const loadUnreadMessages = async () => {
      try {
        const role = user?.role === 'owner' ? 'owner' : 'renter';
        const list = await chatService.getConversations(role);
        if (Array.isArray(list)) {
          const totalUnread = list.reduce((acc, item) => acc + (item.unreadCount || 0), 0);
          dispatch(setUnreadMessagesCount(totalUnread));
        }
      } catch {
        // Fallback silently
      }
    };

    loadUnreadMessages();
  }, [user?.role, dispatch]);

  useEffect(() => {
    const unsub = socketService.onNewMessage(() => {
      dispatch(incrementUnreadMessages());
    });
    return () => unsub();
  }, [dispatch]);

  const handleLogout = useCallback(() => {
    socketService.disconnect();
    dispatch(clearAuth());
  }, [dispatch]);

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
            onNavigateToWishlist={() => navigation.navigate('Wishlist')}
            onNavigateToSearch={() => console.log('[Nav] Search')}
            onNavigateToNotifications={() => navigation.navigate('Notification')}
            onNavigateToChat={() => {
              if (user?.role === 'owner') {
                navigation.navigate('OwnerRoot', { screen: 'OwnerMessages' });
              } else {
                navigation.navigate('MessagesInbox', { from: 'renter' });
              }
            }}
            onNavigateToAiConsultant={() => navigation.navigate('AiChatConsultant')}
            onNavigateToOwnerDashboard={() =>
              navigation.navigate(user?.role === 'owner' ? 'OwnerRoot' : 'OwnerDashboard')
            }
            unreadMessages={unreadMessagesCount}
            unreadNotifications={unreadNotificationsCount}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Bookings">
        {() => (
          <MyBookingsScreen
            onNavigateToBookingDetail={(bookingId) =>
              navigation.navigate('BookingDetail', { bookingId })
            }
            onNavigateToDeviceDetail={(deviceId) =>
              navigation.navigate('DeviceDetail', { deviceId })
            }
            onNavigateToBookingCreate={(deviceId) =>
              navigation.navigate('BookingCreate', { deviceId })
            }
            onNavigateToHome={() => navigation.navigate('Home')}
            onNavigateToChat={(bookingId) =>
              navigation.navigate('ChatDetail', { bookingId })
            }
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

      <Tab.Screen name="Compare" component={AiCompareScreen} />

      <Tab.Screen name="Profile">
        {() => (
          <ProfileScreen
            onLogout={handleLogout}
            onNavigateToLogin={() => navigation.navigate('Login')}
            onNavigateToPostDevice={() => navigation.navigate('PostDevice')}
            onNavigateToMyDevices={() => navigation.navigate('MyDevices')}
            onNavigateToWishlist={() => navigation.navigate('Wishlist')}
            onNavigateToOwnerDashboard={() =>
              navigation.navigate(user?.role === 'owner' ? 'OwnerRoot' : 'OwnerDashboard')
            }
            onNavigateToAdminDashboard={() => navigation.navigate('AdminRoot')}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
