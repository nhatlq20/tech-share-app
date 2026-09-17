/**
 * App.tsx — Root entry point của TechShare Mobile App
 *
 * Kiến trúc điều hướng:
 * - State-based navigation (không dùng React Navigation để tránh re-write toàn bộ)
 * - Bottom Tab Bar được tách ra thành component BottomTabNavigator
 * - Header Actions (Chat + Thông báo) được tách ra thành HeaderActions
 *
 * Theme: Tuân thủ theme-skill.md (Light mode mặc định, White & Blue)
 */

import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  StatusBar,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, RootState } from './src/store';
import { clearAuth } from './src/store/slices/authSlice';
import { theme } from './src/constants/theme';

// ── Screens ──────────────────────────────────────────────────────────────────
import { HomeScreen } from './src/screens/home/HomeScreen';
import { DeviceDetailScreen } from './src/screens/device/DeviceDetailScreen';
import { PostDeviceScreen } from './src/screens/device/PostDeviceScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { RegisterScreen } from './src/screens/auth/RegisterScreen';
import { ProfileScreen } from './src/screens/user/ProfileScreen';
import { BookingCreateScreen } from './src/screens/booking/BookingCreateScreen';
import { MyBookingsScreen } from './src/screens/booking/MyBookingsScreen';
import { MapScreen } from './src/screens/map/MapScreen';
import { OwnerDashboardScreen } from './src/screens/owner/OwnerDashboardScreen';
import { AdminDashboardScreen } from './src/screens/admin/AdminDashboardScreen';

// ── Navigation Components ─────────────────────────────────────────────────────
import { BottomTabNavigator } from './src/components/navigation/BottomTabNavigator';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScreenType =
  | 'home'
  | 'bookings'
  | 'map'
  | 'postDevice'
  | 'owner'
  | 'admin'
  | 'login'
  | 'register'
  | 'profile';

/** Các tab xuất hiện trên Bottom Tab Bar */
const BOTTOM_TAB_SCREENS: ScreenType[] = ['home', 'bookings', 'map', 'profile'];

const ReduxProvider = Provider as any;

// ─── Root Component ───────────────────────────────────────────────────────────

export default function App() {
  return (
    <ReduxProvider store={store}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </ReduxProvider>
  );
}

// ─── AppContent ───────────────────────────────────────────────────────────────

function AppContent() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [currentScreen, setCurrentScreen] = useState('home' as ScreenType);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null as string | null);
  const [bookingDeviceId, setBookingDeviceId] = useState(null as string | null);
  const insets = useSafeAreaInsets();

  // Redirect theo role sau khi đăng nhập thành công
  // - admin  → AdminDashboardScreen
  // - owner  → OwnerDashboardScreen
  // - user   → HomeScreen (mặc định)
  const effectiveScreen: ScreenType = useMemo(() => {
    if (!isAuthenticated && currentScreen === 'home') return 'home';
    if (isAuthenticated && currentScreen === 'login') {
      // Tự động redirect theo role khi vừa đăng nhập từ LoginScreen
      if (user?.role === 'admin') return 'admin';
      if (user?.role === 'owner') return 'owner';
      return 'home';
    }
    return currentScreen;
  }, [currentScreen, isAuthenticated, user?.role]);

  // Active tab cho BottomTabNavigator — login/register/admin/owner map về tab profile
  const activeTab: ScreenType = useMemo(() => {
    if (
      effectiveScreen === 'login' ||
      effectiveScreen === 'register' ||
      effectiveScreen === 'admin' ||
      effectiveScreen === 'owner'
    ) {
      return 'profile';
    }
    if (BOTTOM_TAB_SCREENS.includes(effectiveScreen)) {
      return effectiveScreen;
    }
    return 'home';
  }, [effectiveScreen]);

  // Ẩn Bottom Tab khi xem chi tiết hoặc đặt thuê
  const showBottomTab =
    selectedDeviceId === null && bookingDeviceId === null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleNavigateToDeviceDetail = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  const handleBackFromDetail = () => setSelectedDeviceId(null);

  const goToLogin = () => setCurrentScreen('login');
  const goToHome = () => setCurrentScreen('home');
  const goToPostDevice = () => setCurrentScreen('postDevice');

  const handleLogout = () => {
    dispatch(clearAuth());
    setCurrentScreen('home');
    setSelectedDeviceId(null);
  };

  const handleTabPress = (tab: ScreenType) => {
    if (tab === 'profile' && !isAuthenticated) {
      setCurrentScreen('login');
    } else {
      setCurrentScreen(tab);
    }
  };

  /**
   * Sau khi LoginScreen/RegisterScreen xác thực thành công,
   * điều hướng dựa trên role của user vừa được lưu vào Redux.
   * Nhận `role` từ response API (tránh phụ thuộc vào Redux timing).
   */
  const handleNavigateAfterAuth = (role?: string) => {
    if (role === 'admin') {
      setCurrentScreen('admin');
    } else if (role === 'owner') {
      setCurrentScreen('owner');
    } else {
      setCurrentScreen('home');
    }
  };

  const handlePressChat = () => {
    // TODO: navigate to ChatListScreen khi Nhật implement
    console.log('[Nav] Chat pressed');
  };

  const handlePressNotifications = () => {
    // TODO: navigate to NotificationScreen khi Nhật implement
    console.log('[Nav] Notifications pressed');
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={theme.card}
      />

      {/* ── Màn hình nội dung ── */}
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
                onNavigateToSearch={() => console.log('[Nav] Search')}
                onNavigateToNotifications={handlePressNotifications}
                onNavigateToChat={handlePressChat}
                unreadMessages={2}
                unreadNotifications={5}
              />
            )}

            {effectiveScreen === 'bookings' && (
              <MyBookingsScreen
                onNavigateToDeviceDetail={handleNavigateToDeviceDetail}
                onNavigateToHome={goToHome}
              />
            )}

            {effectiveScreen === 'map' && (
              <MapScreen
                onNavigateToDeviceDetail={handleNavigateToDeviceDetail}
                onNavigateToHome={goToHome}
              />
            )}

            {effectiveScreen === 'postDevice' && (
              <PostDeviceScreen onBack={goToHome} onPublished={goToHome} />
            )}

            {effectiveScreen === 'owner' && (
              <OwnerDashboardScreen
                onBackToHome={goToHome}
                onNavigateToDeviceDetail={handleNavigateToDeviceDetail}
              />
            )}

            {effectiveScreen === 'admin' && (
              <AdminDashboardScreen onBackToHome={goToHome} />
            )}

            {effectiveScreen === 'login' && (
              <LoginScreen
                onNavigateToRegister={() => setCurrentScreen('register')}
                onNavigateToHome={handleNavigateAfterAuth}
              />
            )}

            {effectiveScreen === 'register' && (
              <RegisterScreen
                onNavigateToLogin={() => setCurrentScreen('login')}
                onRegisterSuccess={handleNavigateAfterAuth}
              />
            )}

            {effectiveScreen === 'profile' && (
              <ProfileScreen
                onLogout={handleLogout}
                onNavigateToLogin={goToLogin}
                onNavigateToPostDevice={goToPostDevice}
                onNavigateToOwnerDashboard={() => setCurrentScreen('owner')}
                onNavigateToAdminDashboard={() => setCurrentScreen('admin')}
              />
            )}
          </>
        )}
      </View>

      {/* ── Bottom Tab Navigator ── */}
      {showBottomTab && (
        <BottomTabNavigator
          activeTab={activeTab}
          onTabPress={handleTabPress}
          safeAreaBottom={insets.bottom}
          pendingBookingsCount={0} // TODO: wire to Redux bookings state
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.card,            // #FFFFFF
  },
  screenContainer: {
    flex: 1,
    backgroundColor: theme.background,     // #F8FAFC
  },
});
