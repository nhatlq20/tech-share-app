import React from 'react';
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
import { DeviceDetailScreen } from '../screens/device/DeviceDetailScreen';
import { BookingCreateScreen } from '../screens/booking/BookingCreateScreen';
import { PostDeviceScreen } from '../screens/device/PostDeviceScreen';
import { OwnerDashboardScreen } from '../screens/owner/OwnerDashboardScreen';
import { NotificationScreen } from '../screens/notification/NotificationScreen';
import { MyDevicesScreen } from '../screens/user/MyDevicesScreen';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  AdminRoot: undefined;
  MainTabs: undefined;
  MyDevices: undefined;
  DeviceDetail: { deviceId: string };
  BookingCreate: { deviceId: string };
  PostDevice: undefined;
  OwnerDashboard: undefined;
  Notification: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const DeviceDetailRoute = ({ route, navigation }: any) => (
  <DeviceDetailScreen
    deviceId={route.params.deviceId}
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
          </Stack.Group>
        ) : isAdmin ? (
          <Stack.Group>
            <Stack.Screen name="AdminRoot" component={AdminDrawerNavigator} />
            <Stack.Screen name="MainTabs" component={MainBottomTabNavigator} />
            <Stack.Screen name="DeviceDetail">{DeviceDetailRoute}</Stack.Screen>
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
