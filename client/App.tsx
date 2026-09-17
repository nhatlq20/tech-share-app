import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, RootState } from './src/store';
import { clearAuth } from './src/store/slices/authSlice';
import { HomeScreen } from './src/screens/home/HomeScreen';
import { DeviceDetailScreen } from './src/screens/device/DeviceDetailScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { RegisterScreen } from './src/screens/auth/RegisterScreen';
import { ProfileScreen } from './src/screens/user/ProfileScreen';
import { BookingCreateScreen } from './src/screens/booking/BookingCreateScreen';

export type ScreenType = 'home' | 'login' | 'register' | 'profile';

const ReduxProvider = Provider as any;

export default function App() {
  return (
    <ReduxProvider store={store}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </ReduxProvider>
  );
}

function AppContent() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [currentScreen, setCurrentScreen] = useState('home' as ScreenType);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null as string | null);
  const [bookingDeviceId, setBookingDeviceId] = useState(null as string | null);
  const insets = useSafeAreaInsets();

  const effectiveScreen = useMemo(() => {
    if (isAuthenticated && currentScreen === 'login') {
      return 'home';
    }
    return currentScreen;
  }, [currentScreen, isAuthenticated]);

  const handleNavigateToDeviceDetail = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  const handleBackFromDetail = () => {
    setSelectedDeviceId(null);
  };

  const goToLogin = () => {
    setCurrentScreen('login');
  };

  const goToHome = () => {
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    dispatch(clearAuth());
    setCurrentScreen('login');
    setSelectedDeviceId(null);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#070B13" />

      {!selectedDeviceId && (
        <View
          style={[
            styles.topTabBar,
            { paddingTop: Math.max(8, insets.top + 4) },
          ]}
        >
          <TouchableOpacity
            style={[styles.tabButton, effectiveScreen === 'home' && styles.tabButtonActive]}
            onPress={goToHome}
            activeOpacity={0.8}
          >
            <Ionicons
              name="home-outline"
              size={16}
              color={effectiveScreen === 'home' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text
              style={[styles.tabButtonText, effectiveScreen === 'home' && styles.tabButtonTextActive]}
            >
              Home
            </Text>
          </TouchableOpacity>

          {!isAuthenticated ? (
            <>
              <TouchableOpacity
                style={[styles.tabButton, effectiveScreen === 'login' && styles.tabButtonActive]}
                onPress={goToLogin}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="log-in-outline"
                  size={16}
                  color={effectiveScreen === 'login' ? '#FFFFFF' : '#94A3B8'}
                />
                <Text
                  style={[styles.tabButtonText, effectiveScreen === 'login' && styles.tabButtonTextActive]}
                >
                  Login
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabButton, effectiveScreen === 'register' && styles.tabButtonActive]}
                onPress={() => setCurrentScreen('register')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="person-add-outline"
                  size={16}
                  color={effectiveScreen === 'register' ? '#FFFFFF' : '#94A3B8'}
                />
                <Text
                  style={[styles.tabButtonText, effectiveScreen === 'register' && styles.tabButtonTextActive]}
                >
                  Register
                </Text>
              </TouchableOpacity>
            </>
          ) : null}

          <TouchableOpacity
            style={[styles.tabButton, effectiveScreen === 'profile' && styles.tabButtonActive]}
            onPress={() => setCurrentScreen('profile')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="person-circle-outline"
              size={16}
              color={effectiveScreen === 'profile' ? '#FFFFFF' : '#94A3B8'}
            />
            <Text
              style={[styles.tabButtonText, effectiveScreen === 'profile' && styles.tabButtonTextActive]}
            >
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.screenContainer}>
        {bookingDeviceId ? (
          <BookingCreateScreen 
            deviceId={bookingDeviceId} 
            onBack={() => setBookingDeviceId(null)} 
          />
        ) : selectedDeviceId ? (
          <DeviceDetailScreen 
            deviceId={selectedDeviceId} 
            onBack={handleBackFromDetail} 
            onBookNow={(id) => setBookingDeviceId(id)}
          />
        ) : (
          <>
            {effectiveScreen === 'home' && (
              <HomeScreen
                onNavigateToDeviceDetail={handleNavigateToDeviceDetail}
                onNavigateToSearch={() => {
                  console.log('Điều hướng Search');
                }}
                onNavigateToNotifications={() => {
                  console.log('Điều hướng Notifications');
                }}
              />
            )}

            {effectiveScreen === 'login' && (
              <LoginScreen
                onNavigateToRegister={() => setCurrentScreen('register')}
                onNavigateToHome={goToHome}
              />
            )}

            {effectiveScreen === 'register' && (
              <RegisterScreen
                onNavigateToLogin={() => setCurrentScreen('login')}
                onRegisterSuccess={goToHome}
              />
            )}

            {effectiveScreen === 'profile' && (
              <ProfileScreen
                onLogout={handleLogout}
                onNavigateToLogin={goToLogin}
              />
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#070B13",
  },
  topTabBar: {
    flexDirection: "row",
    backgroundColor: "#0F172A",
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    gap: 6,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minHeight: 40,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#1E293B",
  },
  tabButtonActive: {
    backgroundColor: "#2563EB",
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },
  screenContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#070B13',
  },
});
