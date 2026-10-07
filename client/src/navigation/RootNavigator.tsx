import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootState } from '../store';
import { clearAuth } from '../store/slices/authSlice';
import { clearWishlist } from '../store/slices/wishlistSlice';
import { wishlistService } from '../services/wishlistService';
import { socketService } from '../services/socketService';
import { theme } from '../constants/theme';
import { colors } from '../theme/colors';
import { STRINGS } from '../constants/strings';
import { AdminDrawerNavigator } from './AdminDrawerNavigator';
import { OwnerDrawerNavigator } from './OwnerDrawerNavigator';
import { MainBottomTabNavigator } from './MainBottomTabNavigator';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { DeviceDetailScreen } from '../screens/device/DeviceDetailScreen';
import { BookingCreateScreen } from '../screens/booking/BookingCreateScreen';
import { BookingDetailScreen } from '../screens/booking/BookingDetailScreen';
import { PostDeviceScreen } from '../screens/device/PostDeviceScreen';
import { OwnerDashboardScreen } from '../screens/owner/OwnerDashboardScreen';
import { NotificationScreen } from '../screens/notification/NotificationScreen';
import { MyDevicesScreen } from '../screens/user/MyDevicesScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { BookingManageScreen, BookingManageTab } from '../screens/booking/BookingManageScreen';
import { WishlistScreen } from '../screens/device/WishlistScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  AdminRoot: undefined;
  OwnerRoot:
    | {
        screen?: string;
        params?: {
          initialSection?: 'overview' | 'orders' | 'fleet' | 'wallet' | 'ai_tools';
          _t?: number;
          bookingId?: string;
        };
      }
    | undefined;
  MainTabs: { screen?: string } | undefined;
  MyDevices: undefined;
  DeviceDetail: { deviceId: string; hideBookNow?: boolean };
  BookingDetail: { bookingId: string };
  BookingCreate: { deviceId: string };
  BookingManage: { initialTab?: BookingManageTab } | undefined;
  PostDevice: undefined;
  Wishlist: undefined;
  OwnerDashboard:
    | {
        initialSection?: 'overview' | 'orders' | 'fleet' | 'wallet' | 'ai_tools';
        _t?: number;
        bookingId?: string;
      }
    | undefined;
  Notification: { from?: string } | undefined;
};

export const rootNavigationRef = createNavigationContainerRef<RootStackParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const ONBOARDING_STORAGE_KEY = 'techshare.onboarding.completed';

const DeviceDetailRoute = ({ route, navigation }: any) => {
  const user = useSelector((state: RootState) => state.auth.user);

  return (
    <DeviceDetailScreen
      deviceId={route.params.deviceId}
      hideBookNow={route.params.hideBookNow}
      onBack={() => navigation.goBack()}
      onBookNow={(deviceId) => {
        if (user?.role === 'renter' && !user.isVerified) {
          Alert.alert(
            STRINGS.AUTH_VERIFY_ALERT.TITLE,
            STRINGS.AUTH_VERIFY_ALERT.MSG,
            [
              { text: STRINGS.AUTH_VERIFY_ALERT.LATER, style: 'cancel' },
              {
                text: STRINGS.AUTH_VERIFY_ALERT.VERIFY_NOW,
                onPress: () => navigation.navigate('MainTabs', { screen: 'Profile' }),
              },
            ]
          );
          return;
        }
        navigation.navigate('BookingCreate', { deviceId });
      }}
    />
  );
};

const BookingCreateRoute = ({ route, navigation }: any) => (
  <BookingCreateScreen
    deviceId={route.params.deviceId}
    onBack={() => navigation.goBack()}
    onSuccess={() => navigation.navigate('MainTabs', { screen: 'Bookings' })}
    onNavigateToVerification={() => navigation.navigate('MainTabs', { screen: 'Profile' })}
  />
);

const BookingDetailRoute = ({ route, navigation }: any) => (
  <BookingDetailScreen
    bookingId={route.params.bookingId}
    onBack={() => navigation.goBack()}
    onNavigateToDeviceDetail={(deviceId) => navigation.navigate('DeviceDetail', { deviceId })}
    onNavigateToBookingCreate={(deviceId) => navigation.navigate('BookingCreate', { deviceId })}
  />
);

const BookingManageRoute = ({ route, navigation }: any) => (
  <BookingManageScreen
    route={route}
    navigation={navigation}
    onBack={() => navigation.goBack()}
    onNavigateToBookingDetail={(bookingId) => navigation.navigate('BookingDetail', { bookingId })}
    onNavigateToNotifications={() => navigation.navigate('Notification', { from: 'owner' })}
  />
);

const WishlistRoute = ({ navigation }: any) => (
  <WishlistScreen
    onBack={() => navigation.goBack()}
    onNavigateToDeviceDetail={(deviceId) => navigation.navigate('DeviceDetail', { deviceId })}
    onNavigateToHome={() => navigation.navigate('MainTabs')}
  />
);

const NotificationRoute = ({ route, navigation }: any) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const isOwner = user?.role === 'owner' || route?.params?.from === 'owner';

  return (
    <NotificationScreen
      onBack={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else if (user?.role === 'owner') {
          navigation.navigate('OwnerRoot');
        } else if (route?.params?.from === 'owner') {
          navigation.navigate('OwnerDashboard');
        } else {
          navigation.navigate('MainTabs');
        }
      }}
      onNavigateToBooking={(bookingId) => {
        if (user?.role === 'owner') {
          navigation.navigate('OwnerRoot', {
            screen: 'BookingManage',
            params: { initialTab: 'pending' },
          });
        } else if (route?.params?.from === 'owner') {
          navigation.navigate('BookingManage', { initialTab: 'pending' });
        } else if (bookingId) {
          navigation.navigate('BookingDetail', { bookingId });
        } else {
          navigation.navigate('MainTabs');
        }
      }}
      onNavigateToDevice={(deviceId) => {
        if (deviceId) navigation.navigate('DeviceDetail', { deviceId });
      }}
    />
  );
};

export function RootNavigator() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const isAdmin = isAuthenticated && user?.role === 'admin';
  const isOwner = isAuthenticated && user?.role === 'owner';

  const handleLogout = () => {
    socketService.disconnect();
    wishlistService.clearCache();
    dispatch(clearWishlist());
    dispatch(clearAuth());
  };
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null as boolean | null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)
      .then((value) => setHasSeenOnboarding(value === 'true'))
      .catch(() => setHasSeenOnboarding(false));
  }, []);

  const completeOnboarding = () =>
    AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
      .catch(() => undefined)
      .finally(() => setHasSeenOnboarding(true));

  if (hasSeenOnboarding === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={colors.light.primary} />
      </View>
    );
  }

  if (!hasSeenOnboarding) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return (
    <NavigationContainer ref={rootNavigationRef}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
          animation: 'slide_from_right',
        }}
      >
        {!isAuthenticated ? (
          <Stack.Group>
            <Stack.Screen name="Login">
              {({ navigation }) => (
                <LoginScreen
                  onNavigateToRegister={() => navigation.navigate('Register')}
                  onNavigateToForgotPassword={() => navigation.navigate('ForgotPassword')}
                  onNavigateToHome={() => undefined}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Register">
              {({ navigation }) => (
                <RegisterScreen
                  onNavigateToLogin={() => navigation.navigate('Login')}
                  onRegisterSuccess={() => undefined}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="ForgotPassword">
              {({ navigation }) => (
                <ForgotPasswordScreen
                  onNavigateToLogin={() => navigation.navigate('Login')}
                />
              )}
            </Stack.Screen>
          </Stack.Group>
        ) : isAdmin ? (
          <Stack.Group>
            <Stack.Screen name="AdminRoot" component={AdminDrawerNavigator} />
            <Stack.Screen name="MainTabs" component={MainBottomTabNavigator} />
            <Stack.Screen name="DeviceDetail">{DeviceDetailRoute}</Stack.Screen>
            <Stack.Screen name="BookingDetail">{BookingDetailRoute}</Stack.Screen>
            <Stack.Screen name="BookingCreate">{BookingCreateRoute}</Stack.Screen>
            <Stack.Screen name="Wishlist">{WishlistRoute}</Stack.Screen>
            <Stack.Screen name="Notification">{NotificationRoute}</Stack.Screen>
          </Stack.Group>
        ) : isOwner ? (
          <Stack.Group>
            <Stack.Screen name="OwnerRoot" component={OwnerDrawerNavigator} />
            <Stack.Screen name="MainTabs" component={MainBottomTabNavigator} />
            <Stack.Screen name="MyDevices">
              {({ navigation }) => (
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.light.surface }}>
                  <MyDevicesScreen onBack={() => navigation.goBack()} />
                </SafeAreaView>
              )}
            </Stack.Screen>
            <Stack.Screen name="DeviceDetail">{DeviceDetailRoute}</Stack.Screen>
            <Stack.Screen name="BookingDetail">{BookingDetailRoute}</Stack.Screen>
            <Stack.Screen name="BookingCreate">{BookingCreateRoute}</Stack.Screen>
            <Stack.Screen name="BookingManage">{BookingManageRoute}</Stack.Screen>
            <Stack.Screen name="Wishlist">{WishlistRoute}</Stack.Screen>
            <Stack.Screen name="PostDevice">
              {({ navigation }) => (
                <PostDeviceScreen
                  onBack={() => navigation.goBack()}
                  onPublished={() => navigation.navigate('OwnerRoot')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Notification">{NotificationRoute}</Stack.Screen>
          </Stack.Group>
        ) : (
          <Stack.Group>
            <Stack.Screen name="MainTabs" component={MainBottomTabNavigator} />
            <Stack.Screen name="MyDevices">
              {({ navigation }) => (
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.light.surface }}>
                  <MyDevicesScreen onBack={() => navigation.goBack()} />
                </SafeAreaView>
              )}
            </Stack.Screen>
            <Stack.Screen name="DeviceDetail">{DeviceDetailRoute}</Stack.Screen>
            <Stack.Screen name="BookingDetail">{BookingDetailRoute}</Stack.Screen>
            <Stack.Screen name="BookingCreate">{BookingCreateRoute}</Stack.Screen>
            <Stack.Screen name="BookingManage">{BookingManageRoute}</Stack.Screen>
            <Stack.Screen name="Wishlist">{WishlistRoute}</Stack.Screen>
            <Stack.Screen name="PostDevice">
              {({ navigation }) => (
                <PostDeviceScreen
                  onBack={() => navigation.goBack()}
                  onPublished={() => navigation.navigate('MainTabs')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="OwnerDashboard">
              {({ navigation }) => (
                <SafeAreaView
                  style={{ flex: 1, backgroundColor: theme.background }}
                  edges={['top', 'left', 'right']}
                >
                  <OwnerDashboardScreen
                    navigation={navigation}
                    onNavigateToDeviceDetail={(deviceId) =>
                      navigation.navigate('DeviceDetail', { deviceId })
                    }
                    onNavigateToPostDevice={() => navigation.navigate('PostDevice')}
                    onNavigateToNotifications={() =>
                      navigation.navigate('Notification', { from: 'owner' })
                    }
                    onLogout={handleLogout}
                  />
                </SafeAreaView>
              )}
            </Stack.Screen>
            <Stack.Screen name="Notification">{NotificationRoute}</Stack.Screen>
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
