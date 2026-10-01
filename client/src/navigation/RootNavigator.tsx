import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootState } from '../store';
import { theme } from '../constants/theme';
import { colors } from '../theme/colors';
import { AdminDrawerNavigator } from './AdminDrawerNavigator';
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

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  AdminRoot: undefined;
  MainTabs: undefined;
  MyDevices: undefined;
  DeviceDetail: { deviceId: string; hideBookNow?: boolean };
  BookingDetail: { bookingId: string };
  BookingCreate: { deviceId: string };
  PostDevice: undefined;
  OwnerDashboard: undefined;
  Notification: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const ONBOARDING_STORAGE_KEY = 'techshare.onboarding.completed';

const DeviceDetailRoute = ({ route, navigation }: any) => (
  <DeviceDetailScreen
    deviceId={route.params.deviceId}
    hideBookNow={route.params.hideBookNow}
    onBack={() => navigation.goBack()}
    onBookNow={(deviceId) => navigation.navigate('BookingCreate', { deviceId })}
  />
);

const BookingCreateRoute = ({ route, navigation }: any) => (
  <BookingCreateScreen
    deviceId={route.params.deviceId}
    onBack={() => navigation.goBack()}
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

const NotificationRoute = ({ navigation }: any) => (
  <NotificationScreen
    onBack={() => navigation.goBack()}
    onNavigateToBooking={() => navigation.navigate('MainTabs')}
    onNavigateToDevice={(deviceId) => {
      if (deviceId) navigation.navigate('DeviceDetail', { deviceId });
    }}
  />
);

export function RootNavigator() {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const isAdmin = isAuthenticated && user?.role === 'admin';
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
    <NavigationContainer>
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
                <OwnerDashboardScreen
                  onBackToHome={() => navigation.navigate('MainTabs')}
                  onNavigateToDeviceDetail={(deviceId) =>
                    navigation.navigate('DeviceDetail', { deviceId })
                  }
                  onNavigateToPostDevice={() => navigation.navigate('PostDevice')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Notification">{NotificationRoute}</Stack.Screen>
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
