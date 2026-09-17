import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { AppDrawer } from './AppDrawer';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { DeviceDetailScreen } from '../screens/device/DeviceDetailScreen';
import { BookingCreateScreen } from '../screens/booking/BookingCreateScreen';
import { clearAuth } from '../store/slices/authSlice';
import { RootState } from '../store';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  DeviceDetail: { deviceId: string };
  BookingCreate: { deviceId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator
        key={isAuthenticated ? 'authenticated' : 'guest'}
        initialRouteName={isAuthenticated ? 'Main' : 'Login'}
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#070B13' } }}
      >
        <Stack.Screen name="Main">
          {({ navigation }) => (
            <AppDrawer
              onLogout={() => {
                dispatch(clearAuth());
                navigation.replace('Login');
              }}
              onOpenDevice={(deviceId: string) => navigation.navigate('DeviceDetail', { deviceId })}
            />
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
