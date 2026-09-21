import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { theme } from '../constants/theme';

// Navigators
import { AdminDrawerNavigator } from './AdminDrawerNavigator';
import { MainBottomTabNavigator } from './MainBottomTabNavigator';

// Auth Screens
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { AppDrawer } from './AppDrawer';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';

// Shared Detail & Action Screens
import { DeviceDetailScreen } from '../screens/device/DeviceDetailScreen';
import { BookingCreateScreen } from '../screens/booking/BookingCreateScreen';
import { PostDeviceScreen } from '../screens/device/PostDeviceScreen';
import { OwnerDashboardScreen } from '../screens/owner/OwnerDashboardScreen';
import { NotificationScreen } from '../screens/notification/NotificationScreen';
import { MyDevicesScreen } from '../screens/user/MyDevicesScreen';
import { colors } from '../theme/colors';
import { clearAuth } from '../store/slices/authSlice';
import { RootState } from '../store';

export type RootStackParamList = {
  // Auth
  Login: undefined;
  Register: undefined;
  // Role roots
  AdminRoot: undefined;
  MainTabs: undefined;
  // Shared Screens
  Main: undefined;
  MyDevices: undefined;
  DeviceDetail: { deviceId: string };
  BookingCreate: { deviceId: string };
  PostDevice: undefined;
  OwnerDashboard: undefined;
  Notification: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

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
          // ── 1. AUTH STACK (Chưa đăng nhập) ──
          <Stack.Group>
            <Stack.Screen name="Login">
              {({ navigation }) => (
                <LoginScreen
                  onNavigateToRegister={() => navigation.navigate('Register')}
                  onNavigateToHome={() => {
                    // Redux setAuth sẽ tự động kích hoạt conditional re-render
                  }}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Register">
              {({ navigation }) => (
                <RegisterScreen
                  onNavigateToLogin={() => navigation.navigate('Login')}
                  onRegisterSuccess={() => {
                    // Redux setAuth sẽ tự động kích hoạt conditional re-render
                  }}
                />
              )}
            </Stack.Screen>
          </Stack.Group>
        ) : isAdmin ? (
          // ── 2. ADMIN NAVIGATION (Role === 'admin') ──
          // Mount thẳng vào AdminDrawerNavigator (Không có bất kỳ Bottom Tab nào)
          <Stack.Group>
            <Stack.Screen name="AdminRoot" component={AdminDrawerNavigator} />

            {/* Màn hình Client nếu Admin muốn xem dưới góc nhìn người thuê */}
            <Stack.Screen name="MainTabs" component={MainBottomTabNavigator} />

            {/* Các màn hình chi tiết dùng chung */}
            <Stack.Screen name="DeviceDetail">
              {({ route, navigation }) => (
                <DeviceDetailScreen
                  deviceId={route.params.deviceId}
                  onBack={() => navigation.goBack()}
                  onBookNow={(deviceId) =>
                    navigation.navigate('BookingCreate', { deviceId })
                  }
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="BookingCreate">
              {({ route, navigation }) => (
                <BookingCreateScreen
                  deviceId={route.params.deviceId}
                  onBack={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Notification">
              {({ navigation }) => (
                <NotificationScreen
                  onBack={() => navigation.goBack()}
                  onNavigateToBooking={() => navigation.navigate('MainTabs')}
                  onNavigateToDevice={(deviceId) => {
                    if (deviceId) {
                      navigation.navigate('DeviceDetail', { deviceId });
                    }
                  }}
                />
              )}
            </Stack.Screen>
          </Stack.Group>
        ) : (
          // ── 3. USER / OWNER NAVIGATION (Role !== 'admin') ──
          // Mount vào MainBottomTabNavigator (4 Tab thông thường)
          <Stack.Group>
            <Stack.Screen name="MainTabs" component={MainBottomTabNavigator} />
            <Stack.Screen name="DeviceDetail">
              {({ route, navigation }) => (
                <DeviceDetailScreen
                  deviceId={route.params.deviceId}
                  onBack={() => navigation.goBack()}
                  onBookNow={(deviceId) =>
                    navigation.navigate('BookingCreate', { deviceId })
                  }
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="BookingCreate">
              {({ route, navigation }) => (
                <BookingCreateScreen
                  deviceId={route.params.deviceId}
                  onBack={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
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
            <Stack.Screen name="Notification">
              {({ navigation }) => (
                <NotificationScreen
                  onBack={() => navigation.goBack()}
                  onNavigateToBooking={() => navigation.navigate('MainTabs')}
                  onNavigateToDevice={(deviceId) => {
                    if (deviceId) {
                      navigation.navigate('DeviceDetail', { deviceId });
                    }
                  }}
                />
              )}
            </Stack.Screen>
          </Stack.Group>
        )}
        <Stack.Screen name="Main">
          {({ navigation }) => (
            <AppDrawer
              onLogout={() => {
                dispatch(clearAuth());
                navigation.replace('Login');
              }}
              onOpenDevice={(deviceId: string) => navigation.navigate('DeviceDetail', { deviceId })}
              onOpenMyDevices={() => navigation.navigate('MyDevices')}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="MyDevices" options={{ title: 'My Devices' }}>
          {({ navigation }) => (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.light.surface }}>
              <MyDevicesScreen onBack={() => navigation.goBack()} />
            </SafeAreaView>
          )}
        </Stack.Screen>
        <Stack.Screen name="DeviceDetail">
          {({ route, navigation }) => (
            <DeviceDetailScreen
              deviceId={route.params.deviceId}
              onBack={() => navigation.goBack()}
              onBookNow={(deviceId: string) => navigation.navigate('BookingCreate', { deviceId })}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="BookingCreate">
          {({ route, navigation }) => (
            <BookingCreateScreen
              deviceId={route.params.deviceId}
              onBack={() => navigation.goBack()}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Login">
          {({ navigation }) => (
            <LoginScreen
              onNavigateToRegister={() => navigation.navigate('Register')}
              onNavigateToHome={() => navigation.replace('Main')}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Register">
          {({ navigation }) => (
            <RegisterScreen
              onNavigateToLogin={() => navigation.goBack()}
              onRegisterSuccess={() => navigation.replace('Main')}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
